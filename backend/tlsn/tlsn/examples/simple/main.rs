use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use elliptic_curve::pkcs8::DecodePublicKey;
use serde_json::json;
use std::sync::Mutex;
use std::{str, time::Duration};
use tracing::{error, info};

// Import necessary modules from the original code
use http_body_util::Empty;
use hyper::{body::Bytes, Request, StatusCode};
use hyper_util::rt::TokioIo;
use std::ops::Range;
use tlsn_core::proof::{SessionProof, TlsProof};
use tokio::io::AsyncWriteExt as _;
use tokio_util::compat::{FuturesAsyncReadCompatExt, TokioAsyncReadCompatExt};

use tlsn_examples::run_notary;
use tlsn_prover::tls::{state::Notarize, Prover, ProverConfig};

const SERVER_DOMAIN: &str = "zk-credit-teal.vercel.app";
const USER_AGENT: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

struct AppState {
    proof: Mutex<Option<String>>,
}

async fn generate_proof() -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let (prover_socket, notary_socket) = tokio::io::duplex(1 << 16);

    tokio::spawn(run_notary(notary_socket.compat()));

    let config = ProverConfig::builder()
        .id("example")
        .server_dns(SERVER_DOMAIN)
        .build()
        .unwrap();

    let prover = Prover::new(config)
        .setup(prover_socket.compat())
        .await
        .unwrap();

    let client_socket = tokio::net::TcpStream::connect((SERVER_DOMAIN, 443))
        .await
        .unwrap();

    let (mpc_tls_connection, prover_fut) = prover.connect(client_socket.compat()).await.unwrap();
    let mpc_tls_connection = TokioIo::new(mpc_tls_connection.compat());

    let prover_task = tokio::spawn(prover_fut);

    let (mut request_sender, connection) =
        hyper::client::conn::http1::handshake(mpc_tls_connection)
            .await
            .unwrap();

    tokio::spawn(connection);

    let request = Request::builder()
        .uri("/api/bank")
        .header("Host", SERVER_DOMAIN)
        .header("Accept", "*/*")
        .header("Accept-Encoding", "identity")
        .header("Connection", "close")
        .header("User-Agent", USER_AGENT)
        .body(Empty::<Bytes>::new())
        .unwrap();

    let response = request_sender.send_request(request).await.unwrap();

    println!("Got a response from the server");

    assert!(response.status() == StatusCode::OK);

    let prover = prover_task.await.unwrap().unwrap();

    let prover = prover.start_notarize();

    let proof = build_proof_without_redactions(prover).await;

    let proof_json = serde_json::to_value(&proof)?;

    println!("proof: {}", serde_json::to_string_pretty(&proof_json)?);

    Ok(proof_json)
}

async fn get_proof(data: web::Data<AppState>) -> impl Responder {
    println!("start getting proof");
    let mut proof = data.proof.lock().unwrap();

    if proof.is_none() {
        match generate_proof().await {
            Ok(new_proof) => {
                *proof = Some(serde_json::to_string(&new_proof).unwrap());
                HttpResponse::Ok().json(new_proof)
            }
            Err(e) => HttpResponse::InternalServerError().json(json!({ "error": e.to_string() })),
        }
    } else {
        HttpResponse::Ok().json(json!({ "proof": proof.as_ref().unwrap() }))
    }
}

async fn verify_proof(proof: web::Json<TlsProof>) -> impl Responder {
    match verify_proof_internal(proof.into_inner()) {
        Ok(result) => HttpResponse::Ok().json(json!({ "result": result })),
        Err(e) => HttpResponse::BadRequest().json(json!({ "error": e.to_string() })),
    }
}

fn verify_proof_internal(proof: TlsProof) -> Result<String, Box<dyn std::error::Error>> {
    let TlsProof {
        session,
        substrings,
    } = proof;

    session.verify_with_default_cert_verifier(notary_pubkey())?;

    let SessionProof {
        header,
        session_info,
        ..
    } = session;

    let time = chrono::DateTime::UNIX_EPOCH + Duration::from_secs(header.time());
    let (mut sent, mut recv) = substrings.verify(&header)?;

    sent.set_redacted(b'X');
    recv.set_redacted(b'X');

    let result = String::from_utf8(recv.data().to_vec())?;
    Ok(result)

}

fn notary_pubkey() -> p256::PublicKey {
    let pem_file = str::from_utf8(include_bytes!(
        "../../../notary/server/fixture/notary/notary.pub"
    ))
    .unwrap();
    p256::PublicKey::from_public_key_pem(pem_file).unwrap()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let app_state = web::Data::new(AppState {
        proof: Mutex::new(None),
    });

    println!("Starting server at http://127.0.0.1:8080");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .app_data(app_state.clone())
            .wrap(cors)
            .route("/proof", web::get().to(get_proof))
            .route("/verify", web::post().to(verify_proof))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

// Include the build_proof_without_redactions and find_ranges functions from the original code
async fn build_proof_without_redactions(mut prover: Prover<Notarize>) -> TlsProof {
    let sent_len = prover.sent_transcript().data().len();
    let recv_len = prover.recv_transcript().data().len();

    let builder = prover.commitment_builder();
    let sent_commitment = builder.commit_sent(&(0..sent_len)).unwrap();
    let recv_commitment = builder.commit_recv(&(0..recv_len)).unwrap();

    let notarized_session = prover.finalize().await.unwrap();

    let mut proof_builder = notarized_session.data().build_substrings_proof();

    proof_builder.reveal_by_id(sent_commitment).unwrap();
    proof_builder.reveal_by_id(recv_commitment).unwrap();

    let substrings_proof = proof_builder.build().unwrap();

    TlsProof {
        session: notarized_session.session_proof(),
        substrings: substrings_proof,
    }
}

fn find_ranges(seq: &[u8], private_seq: &[&[u8]]) -> (Vec<Range<usize>>, Vec<Range<usize>>) {
    let mut private_ranges = Vec::new();
    for s in private_seq {
        for (idx, w) in seq.windows(s.len()).enumerate() {
            if w == *s {
                private_ranges.push(idx..(idx + w.len()));
            }
        }
    }

    let mut sorted_ranges = private_ranges.clone();
    sorted_ranges.sort_by_key(|r| r.start);

    let mut public_ranges = Vec::new();
    let mut last_end = 0;
    for r in sorted_ranges {
        if r.start > last_end {
            public_ranges.push(last_end..r.start);
        }
        last_end = r.end;
    }

    if last_end < seq.len() {
        public_ranges.push(last_end..seq.len());
    }

    (public_ranges, private_ranges)
}

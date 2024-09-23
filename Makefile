ui_install:
	cd frontend && bun i

ui_dev:
	cd frontend && bun run dev

tlsn_server:
	cd backend/tlsn/tlsn/examples && cargo run --bin simple_prover

regression_server:
	cd backend/regression && python app.py

create_circuit:
	cd scripts/sindri && venv && python3.10 create_circuits.py

codegen_verifier:
	cd scripts/sindri && venv && python3.10 generate_verifier.py
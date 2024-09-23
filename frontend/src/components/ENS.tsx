"use client";
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from "wagmi";
import { setRecords } from "@ensdomains/ensjs/wallet";
import { http, createWalletClient, custom } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { createEnsPublicClient, addEnsContracts } from "@ensdomains/ensjs";
import { useEffect, useState } from "react";
import Link from "next/link";

declare global {
  interface Window {
    ethereum?: any;
  }
}
export default function ENS({
  creditScore,
  isMLProofVerified,
  proof,
}: {
  creditScore: number;
  isMLProofVerified: boolean;
  proof?: string | null;
}) {
  const { address } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! });

  const [wallet, setWallet] = useState<any>(null);
  const [txHash, setTxHash] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const walletClient = createWalletClient({
        chain: addEnsContracts(sepolia),
        transport: custom(window.ethereum),
      });
      setWallet(walletClient);
    }
  }, []);
  const register = async () => {
    if (!creditScore || !proof) {
      console.log("Please input the value");
      return;
    }
    if (!address) {
      console.log("Please connect wallet");
      return;
    }
    if (!ensName) {
      console.log("Please set ENS name");
      return;
    }

    try {
      const hash = await setRecords(wallet, {
        name: ensName,
        texts: [
          { key: "zk.credit", value: creditScore.toString() },
          { key: "zk.proof", value: proof },
        ],
        resolverAddress: "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD",
        account: address,
      });
      setTxHash(hash);
      console.log("Register success", hash);

      console.log("Register success");
    } catch (error) {
      console.log("Register failed", error);
    }
  };

  const mintNFT = async () => {
    console.log("minting NFT");
    await fetch("/api/mint-nft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zkScore: creditScore,
        zkProof: proof,
        toAddress: address,
      }),
    }).then((res) => {
      if (res.ok) {
        alert("NFT minted successfully");
      } else {
        alert("Failed to mint NFT");
      }
    });
  };

  return (
    <div className="">
      <p>Your ENS: {ensName}</p>
      <p>Your Score: {creditScore && isMLProofVerified && creditScore}</p>
      <button
        onClick={() => register()}
        className="w-full bg-indigo-600 px-4 py-2 rounded-xl text-white hover:bg-indigo-500"
      >
        Save Record to ENS
      </button>
      {txHash && (
        <Link href={`https://ens.app/${ensName}`} target="_blank">
          <p className="text-blue-400 underline">Check on ENS</p>
        </Link>
      )}
      {proof && (
        <button
          onClick={() => mintNFT()}
          className="w-full mt-2 bg-indigo-600 px-4 py-2 rounded-xl text-white hover:bg-indigo-500"
        >
          Mint NFT
        </button>
      )}
    </div>
  );
}

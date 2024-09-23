"use client";

import { useEffect, useState } from "react";

import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
} from "@heroicons/react/20/solid";
import {
  UsersIcon,
  HomeIcon,
  PlusCircleIcon,
  ArrowsRightLeftIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { AppDemo } from "@/components/bank/Chart";
import Image from "next/image";

type StatItem = {
  name: string;
  stat: string;
  change: string;
  changeType: "increase" | "decrease";
};

const navigation = [
  { name: "Dashboard", href: "#", icon: HomeIcon, current: true },
  { name: "History", href: "#", icon: UsersIcon, current: false },
];

export default function Bank() {
  const [balance, setBalance] = useState<StatItem>();
  const [proof, setProof] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/bank");
        const result = await response.json();

        setBalance(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleMock = async () => {
    console.log("mock");
  };

  const [isProofGenerating, setIsProofGenerating] = useState(false);

  const proveTlsn = async () => {
    setIsProofGenerating(true);
    try {
      const response = await fetch("http://localhost:8080/proof", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched data:", data);
      setProof(JSON.stringify(data, null, 2)); // Format JSON with indentation
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsProofGenerating(false);
    }
  };

  const downloadProof = () => {
    if (proof) {
      const element = document.createElement("a");
      const file = new Blob([proof], { type: "application/json" });
      element.href = URL.createObjectURL(file);
      element.download = "proof.json";
      document.body.appendChild(element);
      element.click();
    }
  };

  return (
    <div>
      <div className="lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <Image
              alt="bank-logo"
              src={`/bank-logo.webp`}
              width={50}
              height={50}
            ></Image>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className={clsx(
                          item.current
                            ? "bg-gray-50 text-lime-600"
                            : "text-gray-700 hover:bg-gray-50 hover:text-lime-600",
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                        )}
                      >
                        <item.icon
                          aria-hidden="true"
                          className={clsx(
                            item.current
                              ? "text-lime-600"
                              : "text-gray-400 group-hover:text-lime-600",
                            "h-6 w-6 shrink-0"
                          )}
                        />
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <main className="py-10 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex w-full">
            <div className="flex-1">
              <div className="flex flex-col-reverse justify-between gap-x-16 gap-y-8 rounded-2xl bg-lime-600 p-8 sm:w-11/12 sm:max-w-xl sm:flex-row-reverse sm:items-end lg:w-full lg:max-w-none lg:flex-auto lg:flex-col lg:items-start lg:gap-y-28">
                <div>
                  <p className="text-sm text-white">Available Balance</p>
                  <p className="flex-none text-3xl font-bold tracking-tight text-white">
                    {balance?.stat} USD
                  </p>
                </div>
                <div className="grid grid-cols-3 w-full gap-4">
                  <button className="bg-slate-100 py-8  rounded-2xl text-center">
                    <PlusCircleIcon className="h-6 w-6 mx-auto mb-1" />
                    Add Money
                  </button>
                  <button className="bg-slate-100 py-8  rounded-2xl">
                    <ArrowsRightLeftIcon className="h-6 w-6 mx-auto mb-1" />
                    Transfer
                  </button>
                  <button className="bg-slate-100 py-8  rounded-2xl">
                    <ArrowRightStartOnRectangleIcon className="h-6 w-6 mx-auto mb-1" />
                    Withdraw
                  </button>
                </div>
              </div>
              <AppDemo />
            </div>
            <div className="flex-1 flex">
              <div className="ml-auto">
                <button
                  className="bg-orange-400 px-4 py-2 rounded-lg flex items-center"
                  onClick={() => proveTlsn()}
                  disabled={isProofGenerating}
                >
                  {isProofGenerating && (
                    <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                  )}
                  {isProofGenerating ? "Generating Proof..." : "Generate Proof"}
                </button>
                {proof && (
                  <>
                    <div className="mt-4 bg-white border border-gray-300 p-4 rounded-lg max-h-64 max-w-lg overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {proof}
                      </pre>
                    </div>
                    <button
                      className="bg-orange-400 px-4 py-2 rounded-lg mt-2"
                      onClick={downloadProof}
                    >
                      Download Proof
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
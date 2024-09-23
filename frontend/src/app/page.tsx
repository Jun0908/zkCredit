"use client";

import { useEffect, useRef, useState } from "react";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/20/solid";
import {
  UsersIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  ChatBubbleBottomCenterTextIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

import { clsx } from "clsx";

import { Account } from "./Account";
import { WalletOptions } from "./WalletOptions";
import { useAccount, useReadContract } from "wagmi";
import { readContract } from '@wagmi/core'
import ENS from "@/components/ENS";
import { CIRCUIT_ID } from "@/config/circuit";
import { ETHEREUM_SEPOLIA_VERIFIER_ADDRESS } from "@/config/contract";
import { config } from "./config";

const navigation = [
  { name: "Dashboard", href: "#", icon: HomeIcon, current: true },
  { name: "Team", href: "#", icon: UsersIcon, current: false },
];

const contractABI = [{"inputs":[],"name":"EC_SCALAR_MUL_FAILURE","type":"error"},{"inputs":[],"name":"MOD_EXP_FAILURE","type":"error"},{"inputs":[],"name":"PROOF_FAILURE","type":"error"},{"inputs":[{"internalType":"uint256","name":"expected","type":"uint256"},{"internalType":"uint256","name":"actual","type":"uint256"}],"name":"PUBLIC_INPUT_COUNT_INVALID","type":"error"},{"inputs":[],"name":"PUBLIC_INPUT_GE_P","type":"error"},{"inputs":[],"name":"PUBLIC_INPUT_INVALID_BN128_G1_POINT","type":"error"},{"inputs":[],"name":"getVerificationKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes","name":"_proof","type":"bytes"},{"internalType":"bytes32[]","name":"_publicInputs","type":"bytes32[]"}],"name":"verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]

export default function Home() {
  const [creditScore, setCreditScore] = useState<number>(670.667358);

  const stats = [
    {
      name: "Total Mobile Money Transactions",
      stat: "$908.04",
      change: "5.4%",
      changeType: "increase",
      icon: DevicePhoneMobileIcon,
    },
    {
      name: "Wallet Balance (ETH)",
      stat: "1.29",
      change: "3.2%",
      changeType: "decrease",
      icon: CurrencyDollarIcon,
    },
    {
      name: "Mobile Phone Usage",
      stat: "99.41",
      change: "3.2%",
      changeType: "decrease",
      icon: DevicePhoneMobileIcon,
    },
    {
      name: "Social Media Activity Data",
      stat: "24.57%",
      change: "3.2%",
      changeType: "decrease",
      icon: ChatBubbleBottomCenterTextIcon,
    },
    {
      name: "Number of Late Payments",
      stat: "4",
      change: "3.2%",
      changeType: "decrease",
      icon: ExclamationTriangleIcon,
    },
  ];

  const [bankAccountData, setBankAccountData] = useState({
    name: "Bank Account Balance",
    stat: "",
    change: "",
    changeType: "",
  });

  function ConnectWallet() {
    const { isConnected } = useAccount();
    if (isConnected) return <Account />;
    return <WalletOptions />;
  }

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDivClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
      console.log("aaa");
    }
  };

  const [fileName, setFileName] = useState<string | null>(null);

  const [isBankAccountVerified, setIsBankAccountVerified] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setCreditScore((prevScore) => prevScore + 1);
    }
  };

  const handleVerify = async () => {
    console.log("Verifying...");
    if (!file) {
      console.error("No file selected");
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const fileContent = fileReader.result;
      try {
        const response = await fetch("http://localhost:8080/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: fileContent as string,
        });

        const responseBody = await response.text();
        console.log("Response body:", responseBody);

        // Parse the response to extract the JSON part
        const jsonMatch = responseBody.match(/\{.*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          try {
            const jsonResponse = JSON.parse(jsonString);
            console.log("Parsed JSON response:", jsonResponse);

            // Update bankAccountData with the parsed response
            setBankAccountData({
              name: jsonResponse.name || "Bank Account Balance",
              //   stat: `$${parseFloat(jsonResponse.stat).toFixed(2)}` || "$752.56",
              stat: "$752.56",
              change: jsonResponse.change || "0%",
              changeType: jsonResponse.changeType || "increase",
            });
            setIsBankAccountVerified(true);
          } catch (jsonError) {
            console.error("Error parsing JSON:", jsonError);
          }
        } else {
          console.error("No JSON data found in the response");
        }

        if (response.ok) {
          console.log("Verification successful");
          setIsBankAccountVerified(true);
        } else {
          console.error("Verification failed");
        }
      } catch (error) {
        console.error("Error during verification:", error);
      }
    };
    fileReader.readAsText(file);
  };

  const [mlProof, setMLProof] = useState<string | null>(null);
  const [mlPublicInputs, setMLPublicInputs] = useState<string[] | null>(null);
  const [isMLProofVerified, setIsMLProofVerified] = useState(false);

  const fetchProofDetails = async (proofId: string) => {
	try {
	  const response = await fetch(`https://sindri.app/api/v1/proof/${proofId}/detail`, {
		method: 'GET',
		headers: {
		  'Accept': 'application/json',
		  "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SINDRI_API_KEY}`
		}
	  });
  
	  if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	  }
  
	  const res = await response.json();

	  console.log({ res });

	  setMLProof(res.proof.proof);
  
	  if (res.public && res.public['Verifier.toml']) {
		const publicInputString = res.public['Verifier.toml'];
		const match = publicInputString.match(/0x[0-9a-fA-F]{64}/);
		if (match) {
			console.log(match[0]);
		  setMLPublicInputs([match[0]]);
		  setIsProofGenerating(false);
		} else {
		  console.error('No valid public input found.');
		}
	  } else {
		console.error('Verifier.toml not found in the response.');
	  }
	} catch (error) {
	  console.error('Error fetching proof details:', error);
	}
  };

  const [isProofGenerating, setIsProofGenerating] = useState(false);
  const generateMLProof = async () => {
	console.log("Generating ML proof");
	setIsProofGenerating(true);
	try {
	  const parseFloatSafe = (value: any) => {
		const parsed = parseFloat(value);
		return isNaN(parsed) ? 0 : Math.round(parsed);
	  };
  
	  const parseIntSafe = (value: any) => {
		const parsed = parseInt(value);
		return isNaN(parsed) ? 0 : parsed;
	  };
  
	  const data = {
		"Account Balance": parseFloatSafe(bankAccountData.stat.replace("$", "")),
		"Wallet Balance (ETH)": parseFloatSafe(
		  stats.find((item) => item.name === "Wallet Balance (ETH)")?.stat
		),
		"Total Mobile Money Transactions": parseFloatSafe(
		  stats
			.find((item) => item.name === "Total Mobile Money Transactions")
			?.stat.replace("$", "")
		),
		"Social Media Activity Data": parseFloatSafe(
		  stats
			.find((item) => item.name === "Social Media Activity Data")
			?.stat.replace("%", "")
		),
		"Mobile Phone Usage": parseFloatSafe(
		  stats.find((item) => item.name === "Mobile Phone Usage")?.stat
		),
		"Number of Late Payments": parseIntSafe(
		  stats.find((item) => item.name === "Number of Late Payments")?.stat
		),
	  };
  
	  const inputs = [
		data["Account Balance"],
		data["Total Mobile Money Transactions"],
		data["Wallet Balance (ETH)"],
		data["Mobile Phone Usage"],
		data["Social Media Activity Data"],
		data["Number of Late Payments"],
	  ];

	  console.log({ inputs });
  
	  const response = await fetch(
		`https://sindri.app/api/v1/circuit/${CIRCUIT_ID}/prove`,
		{
		  method: "POST",
		  headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
			Authorization: `Bearer ${process.env.NEXT_PUBLIC_SINDRI_API_KEY}`,
		  },
		  body: new URLSearchParams({
			meta: "{}",
			proof_input: JSON.stringify({ inputs }),
		  }),
		}
	  );
  
	  if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	  }
  
	  const responseData = await response.json();
	  console.log(responseData);
	  console.log(responseData.proof_id);
  
	  setTimeout(() => {
		fetchProofDetails(responseData.proof_id);
	  }, 10000);
	} catch (error) {
	  console.error("Error generating proof:", error);
	} finally {
	}
  };

  const verifyMLProof = async () => {
	console.log("Verifying ML proof");
	const formattedMLProof = mlProof?.startsWith('0x') ? mlProof : `0x${mlProof}`;

	try {
		const result: any = await readContract(config, {
			address: ETHEREUM_SEPOLIA_VERIFIER_ADDRESS,
			abi: contractABI,
			functionName: 'verify',
			args: [formattedMLProof, mlPublicInputs],
		});
		console.log('Verification result:', result);
		setIsMLProofVerified(result);
	} catch (error) {
		console.error('Error during verification:', error);
	}
	};

  const wait = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const reloadCreditScore = async () => {
    console.log("Reloading");
    try {
      const parseFloatSafe = (value: any) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0.0 : parsed;
      };

      const parseIntSafe = (value: any) => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      const data = {
        "Account Balance": parseFloatSafe(
          bankAccountData.stat.replace("$", "")
        ),
        "Wallet Balance (ETH)": parseFloatSafe(
          stats.find((item) => item.name === "Wallet Balance (ETH)")?.stat
        ),
        "Total Mobile Money Transactions": parseFloatSafe(
          stats
            .find((item) => item.name === "Total Mobile Money Transactions")
            ?.stat.replace("$", "")
        ),
        "Social Media Activity Data": parseFloatSafe(
          stats
            .find((item) => item.name === "Social Media Activity Data")
            ?.stat.replace("%", "")
        ),
        "Mobile Phone Usage": parseFloatSafe(
          stats.find((item) => item.name === "Mobile Phone Usage")?.stat
        ),
        "Number of Late Payments": parseIntSafe(
          stats.find((item) => item.name === "Number of Late Payments")?.stat
        ),
      };

      const response = await fetch("http://localhost:5001/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log({ result });
      setCreditScore(result.prediction);
    } catch (error) {
      console.error("Error fetching updated credit score:", error);
    }
  };

  return (
    <div>
      <div className="lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <p className="font-bold text-lg text-indigo-800">zkCredit</p>
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
                            ? "bg-gray-50 text-indigo-600"
                            : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                        )}
                      >
                        <item.icon
                          aria-hidden="true"
                          className={clsx(
                            item.current
                              ? "text-indigo-600"
                              : "text-gray-400 group-hover:text-indigo-600",
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
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="text-2xl font-semibold leading-6 text-gray-900">
                  Credit Score: {creditScore}
                </h3>
                <ArrowPathIcon
                  onClick={() => {
                    reloadCreditScore();
                  }}
                  className="mx-auto h-6 w-6 ml-4"
                ></ArrowPathIcon>
                {isMLProofVerified && (
                  <CheckBadgeIcon
                    className="h-12 w-12 ml-2"
                    style={{ fill: "url(#grad)" }}
                  />
                )}
              </div>
              <div className="mb-2 items-right">
                <ConnectWallet />
              </div>
            </div>
            <svg width={0} height={0}>
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop
                    offset="0%"
                    style={{ stopColor: "#22c1c3", stopOpacity: 1 }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: "#79fd2d", stopOpacity: 1 }}
                  />
                </linearGradient>
              </defs>
            </svg>

            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow border sm:px-6 sm:pt-6">
                <dt>
                  <div className="absolute rounded-md bg-indigo-500 p-3">
                    <BanknotesIcon
                      aria-hidden="true"
                      className="h-6 w-6 text-white"
                    />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">
                    Bank Account Balance
                  </p>
                </dt>
                <dd className="ml-16 flex items-baseline pb-6 sm:pb-4">
                  {fileName ? (
                    <div>
                      <div className="flex items-center">
                        <p className="text-2xl font-semibold text-gray-900">
                          {bankAccountData.stat}
                        </p>
                        {isBankAccountVerified ? (
                          <CheckBadgeIcon
                            className="h-8 w-8 ml-2"
                            style={{ fill: "url(#grad)" }}
                          />
                        ) : (
                          <button
                            className="ml-2 bg-slate-400 rounded-lg px-2 py-1 text-white"
                            onClick={() => {
                              handleVerify();
                            }}
                          >
                            Verify
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Selected file: {fileName}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-4 py-6"
                      onClick={handleDivClick}
                    >
                      <div className="text-center">
                        <DocumentArrowUpIcon
                          aria-hidden="true"
                          className="mx-auto h-8 w-8 text-gray-300"
                        />
                        <div className="mt-2 flex text-sm leading-6 text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept=".json,application/json"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* <p className="text-2xl font-semibold text-gray-900">
                    $1311.41
                  </p> */}

                  <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="text-sm">
                      <a
                        href="#"
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View source
                        <span className="sr-only"> stats</span>
                      </a>
                    </div>
                  </div>
                </dd>
              </div>
              {stats.map((item) => (
                <div
                  key={item.name}
                  className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow border sm:px-6 sm:pt-6"
                >
                  <dt>
                    <div className="absolute rounded-md bg-indigo-500 p-3">
                      <item.icon
                        aria-hidden="true"
                        className="h-6 w-6 text-white"
                      />
                    </div>
                    <p className="ml-16 truncate text-sm font-medium text-gray-500">
                      {item.name}
                    </p>
                  </dt>
                  <dd className="mt-1 ml-16 flex items-center pb-6 sm:pb-7">
                    <p className="text-2xl font-semibold text-gray-900">
                      {item.stat}
                    </p>

                    <CheckBadgeIcon
                      className="h-8 w-8 ml-2"
                      style={{ fill: "url(#grad)" }}
                    />
                    {/* <CheckBadgeIcon className="ml-2 h-8 w-8 text-green-500 font-bold" /> */}

                    <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                      <div className="text-sm">
                        <a
                          href="#"
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          View source
                          <span className="sr-only"> {item.name} stats</span>
                        </a>
                      </div>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid sm:grid-cols-3 mt-12 gap-4 ">
              <div className="w-full">
                <p className="font-semibold">Step2: Generate ML proof</p>
                <button
                  className="w-full bg-indigo-600 text-white py-2 mt-2 rounded-lg flex items-center justify-center"
                  onClick={() => generateMLProof()}
                  disabled={isProofGenerating}
                >
                  {isProofGenerating && (
                    <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                  )}
                  {isProofGenerating ? "Generating..." : "Generate"}
                </button>
                {mlProof && (
                  <>
                    <div className="mt-4 bg-white border border-gray-300 p-4 rounded-lg max-h-64 max-w-lg overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {mlProof}
                      </pre>
                    </div>
                  </>
                )}
              </div>
              <div>
                <p className="font-semibold">Step2: Verify ML Proof</p>
                <button
                  className="w-full bg-indigo-600 py-2 mt-2 rounded-lg text-white"
                  onClick={() => verifyMLProof()}
                >
                  {isMLProofVerified ? "Verified Successfully" : "Verify"}
                </button>
              </div>
              <div>
                <p className="font-semibold">Step3: Store</p>
                <ENS
                  creditScore={creditScore}
                  isMLProofVerified={isMLProofVerified}
                  proof={mlProof}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { toAddress, zkScore, zkProof } = await req.json();

  const API_KEY_SECRET =
    process.env.OWL_API_KEY_SECRET || "24d89857-ed25-4b2f-b529-4478ec63cf06";
  /***** Mint Asset to User *****/
  const image = "https://picsum.photos/200"; // Replace with your image. Make sure the image is properly hosted online.

  const metadata = {
    name: "zk credit score",
    description: "This is zk credit score",
    zkScore,
    zkProof,
    image,
  };
  const apiOptions = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": API_KEY_SECRET,
    },
    body: JSON.stringify({ to: [toAddress], metadata }),
  };

  try {
    const response = await fetch(
      `https://api.owl.build/api/project/collection/6660001/0x96f7dF645F45F418C1763BE8DDf2bb61337cE9E3/mint-batch/erc721AutoId`,
      apiOptions
    );
    if (!response.ok) {
      throw new Error(`Failed to mint NFT: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(data);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error minting NFT:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

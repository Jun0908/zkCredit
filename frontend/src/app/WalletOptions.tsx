import * as React from "react";
import { Connector, useConnect } from "wagmi";
import { metaMask } from "wagmi/connectors";

export function WalletOptions() {
  const { connectors, connect } = useConnect();

   return (
     <button
       onClick={() => connect({ connector: metaMask() })}
       className="bg-slate-300 px-4 py-2 rounded-lg"
     >
       Connect MetaMask
     </button>
   );

}

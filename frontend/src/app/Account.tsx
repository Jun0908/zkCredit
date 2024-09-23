import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from "wagmi";

export function Account() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! });

  return (
    <div>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && (
        <div className="font-semibold">
          {ensName
            ? `${ensName} (${address.slice(0, 10)}...)`
            : address.slice(0, 12)}
        </div>
      )}
      <div className="flex mt-1">
        <button
          onClick={() => disconnect()}
          className="text-sm bg-slate-200 px-2 py-1 rounded-lg ml-auto"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

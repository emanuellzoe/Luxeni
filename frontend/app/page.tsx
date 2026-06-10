"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { LUXENI, luxeniAbi } from "../lib/contract";

const card: React.CSSProperties = {
  background: "#141823",
  border: "1px solid #232838",
  borderRadius: 16,
  padding: 20,
  maxWidth: 420,
  margin: "0 auto",
};

export default function App() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Auto-connect inside MiniPay (it injects window.ethereum.isMiniPay).
  useEffect(() => {
    const eth = (typeof window !== "undefined" ? (window as any).ethereum : undefined);
    if (eth?.isMiniPay && !isConnected) {
      connect({ connector: injected() });
    }
  }, [isConnected, connect]);

  const { data: season } = useReadContract({
    address: LUXENI,
    abi: luxeniAbi,
    functionName: "currentSeason",
    chainId: celo.id,
  });

  const { data: energy } = useReadContract({
    address: LUXENI,
    abi: luxeniAbi,
    functionName: "energyOf",
    args: address ? [address] : undefined,
    chainId: celo.id,
    query: { enabled: !!address },
  });

  const wrongChain = isConnected && chainId !== celo.id;

  return (
    <main style={{ padding: "48px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>🎨 Luxeni</h1>
        <p style={{ color: "#8b93a7", marginTop: 6 }}>On-chain Territory War · Celo</p>
      </div>

      <div style={card}>
        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "#5b8cff", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
            }}
          >
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
        ) : (
          <>
            <Row label="Address" value={`${address!.slice(0, 6)}…${address!.slice(-4)}`} />
            <Row label="Network" value={wrongChain ? "⚠️ Switch to Celo" : "Celo Mainnet"} />
            <Row label="Season" value={season !== undefined ? `#${season}` : "…"} />
            <Row
              label="Energy (free / paid)"
              value={energy ? `${energy[0].toString()} / ${energy[1].toString()} LUX` : "…"}
            />
            <button
              onClick={() => disconnect()}
              style={{
                width: "100%", marginTop: 16, padding: "10px", borderRadius: 12,
                border: "1px solid #2c3245", background: "transparent", color: "#8b93a7", cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      <p style={{ textAlign: "center", color: "#5b6273", fontSize: 12, marginTop: 20 }}>
        Contract {LUXENI.slice(0, 10)}… · verified on Celoscan
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1d2230" }}>
      <span style={{ color: "#8b93a7" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

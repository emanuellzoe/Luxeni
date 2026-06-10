"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther } from "viem";
import {
  useAccount, useConnect, useDisconnect, useReadContract, useReadContracts,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { useQueryClient } from "@tanstack/react-query";
import { LUXENI, luxeniAbi, WIDTH, VIEW, TEAM_COLORS } from "../lib/contract";

const card: React.CSSProperties = {
  background: "#141823", border: "1px solid #232838", borderRadius: 16,
  padding: 18, maxWidth: 440, margin: "0 auto 16px",
};
const btn = (bg: string): React.CSSProperties => ({
  padding: "10px 14px", borderRadius: 10, border: "none", background: bg,
  color: "#fff", fontWeight: 600, cursor: "pointer",
});

export default function App() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const qc = useQueryClient();

  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    if (eth?.isMiniPay && !isConnected) connect({ connector: injected() });
  }, [isConnected, connect]);

  // --- tx helper: write then refetch all reads on confirm ---
  const { writeContract, data: txHash, isPending: txPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (confirmed) qc.invalidateQueries(); }, [confirmed, qc]);
  const busy = txPending || confirming;
  const write = (functionName: string, args: any[] = [], value?: bigint) =>
    writeContract({ address: LUXENI, abi: luxeniAbi, functionName, args, value, chainId: celo.id } as any);

  // --- reads ---
  const { data: season } = useReadContract({ address: LUXENI, abi: luxeniAbi, functionName: "currentSeason", chainId: celo.id });
  const { data: count } = useReadContract({ address: LUXENI, abi: luxeniAbi, functionName: "battlefieldCount", chainId: celo.id });
  const { data: energy } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "energyOf",
    args: address ? [address] : undefined, chainId: celo.id, query: { enabled: !!address },
  });

  const [bf, setBf] = useState<number>(0);
  useEffect(() => { if (count && bf === 0) setBf(Number(count)); }, [count, bf]);

  const { data: myTeam } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "playerTeam",
    args: address && bf ? [BigInt(bf), address] : undefined, chainId: celo.id, query: { enabled: !!address && !!bf },
  });

  // grid: 10x10 window read via multicall
  const tileCalls = useMemo(() => {
    if (!bf) return [];
    const c = [];
    for (let y = 0; y < VIEW; y++)
      for (let x = 0; x < VIEW; x++)
        c.push({ address: LUXENI, abi: luxeniAbi, functionName: "tiles", args: [BigInt(bf), BigInt(y * WIDTH + x)], chainId: celo.id });
    return c as any;
  }, [bf]);
  const { data: tiles } = useReadContracts({ contracts: tileCalls, query: { enabled: tileCalls.length > 0 } });

  const wrongChain = isConnected && chainId !== celo.id;
  const [amount, setAmount] = useState("0.01");

  return (
    <main style={{ padding: "32px 16px 64px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>🎨 Luxeni</h1>
        <p style={{ color: "#8b93a7", marginTop: 4 }}>Territory War · Celo · Season #{season?.toString() ?? "…"}</p>
      </div>

      {!isConnected ? (
        <div style={card}>
          <button onClick={() => connect({ connector: injected() })} disabled={isPending} style={{ ...btn("#5b8cff"), width: "100%", padding: 14 }}>
            {isPending ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      ) : (
        <>
          {/* wallet + energy + buy */}
          <div style={card}>
            <Row label="Wallet" value={`${address!.slice(0, 6)}…${address!.slice(-4)}`} />
            <Row label="Network" value={wrongChain ? "⚠️ Switch to Celo" : "Celo Mainnet"} />
            <Row label="Energy (free/paid)" value={energy ? `${energy[0]} / ${energy[1]} LUX` : "…"} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #2c3245", background: "#0e1118", color: "#fff" }} />
              <button disabled={busy} onClick={() => write("buyLux", [], parseEther(amount || "0"))} style={btn("#36d399")}>
                Buy LUX
              </button>
            </div>
            <button onClick={() => disconnect()} style={{ ...btn("transparent"), border: "1px solid #2c3245", color: "#8b93a7", width: "100%", marginTop: 10 }}>
              Disconnect
            </button>
          </div>

          {/* battlefield */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "#8b93a7" }}>Battlefield</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button disabled={busy} onClick={() => setBf(Math.max(1, bf - 1))} style={btn("#232838")}>−</button>
                <b style={{ minWidth: 28, textAlign: "center" }}>#{bf || "…"}</b>
                <button disabled={busy || (count ? bf >= Number(count) : true)} onClick={() => setBf(bf + 1)} style={btn("#232838")}>+</button>
                <button disabled={busy} onClick={() => write("createBattlefield")} style={btn("#5b8cff")}>New</button>
              </div>
            </div>

            {Number(myTeam ?? 0) === 0 ? (
              <div>
                <p style={{ color: "#8b93a7", margin: "4px 0 8px" }}>Pick a team to join:</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4].map((t) => (
                    <button key={t} disabled={busy || !bf} onClick={() => write("joinBattlefield", [BigInt(bf), t])}
                      style={{ ...btn(TEAM_COLORS[t]), flex: 1 }}>
                      Team {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: "#8b93a7" }}>
                You're on <b style={{ color: TEAM_COLORS[Number(myTeam)] }}>Team {Number(myTeam)}</b>. Tap a tile to claim (empty=1, enemy=3 LUX).
              </p>
            )}
          </div>

          {/* grid */}
          {Number(myTeam ?? 0) !== 0 && (
            <div style={{ ...card, padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${VIEW}, 1fr)`, gap: 3 }}>
                {Array.from({ length: VIEW * VIEW }).map((_, i) => {
                  const x = i % VIEW, y = Math.floor(i / VIEW);
                  const res = tiles?.[i]?.result as readonly [number, string] | undefined;
                  const team = res ? Number(res[0]) : 0;
                  return (
                    <button key={i} title={`(${x},${y})`} disabled={busy}
                      onClick={() => write("claimTile", [BigInt(bf), x, y])}
                      style={{ aspectRatio: "1", border: "none", borderRadius: 4, cursor: "pointer", background: TEAM_COLORS[team] }} />
                  );
                })}
              </div>
              <p style={{ color: "#5b6273", fontSize: 12, textAlign: "center", marginTop: 8 }}>
                10×10 window (top-left of the 80×80 board){busy ? " · confirming…" : ""}
              </p>
            </div>
          )}
        </>
      )}

      <p style={{ textAlign: "center", color: "#5b6273", fontSize: 12, marginTop: 12 }}>
        {LUXENI.slice(0, 10)}… · verified on Celoscan
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1d2230" }}>
      <span style={{ color: "#8b93a7" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

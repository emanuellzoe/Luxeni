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

const CAPACITY = 100;

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

  const { writeContract, data: txHash, isPending: txPending, error: writeError } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });
  // refetch on confirm, then again after a beat to beat RPC read-after-write lag
  useEffect(() => {
    if (!confirmed) return;
    qc.invalidateQueries();
    const t = setTimeout(() => qc.invalidateQueries(), 2500);
    return () => clearTimeout(t);
  }, [confirmed, qc]);
  const busy = txPending || confirming;
  const errMsg =
    (writeError as any)?.shortMessage || (receiptError as any)?.shortMessage ||
    (writeError as any)?.message || (receiptError as any)?.message || "";
  const write = (functionName: string, args: any[] = [], value?: bigint) =>
    writeContract({ address: LUXENI, abi: luxeniAbi, functionName, args, value, chainId: celo.id } as any);

  // --- reads ---
  const { data: season } = useReadContract({ address: LUXENI, abi: luxeniAbi, functionName: "currentSeason", chainId: celo.id });
  const { data: count } = useReadContract({ address: LUXENI, abi: luxeniAbi, functionName: "battlefieldCount", chainId: celo.id });
  const { data: energy } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "energyOf",
    args: address ? [address] : undefined, chainId: celo.id, query: { enabled: !!address },
  });

  // matchmaking candidate = latest battlefield
  const candidate = count ? Number(count) : 0;
  const { data: bfInfo } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "battlefields",
    args: candidate ? [BigInt(candidate)] : undefined, chainId: celo.id, query: { enabled: !!candidate },
  });
  const teamCalls = useMemo(() => (candidate ? [1, 2, 3, 4].map((t) => ({
    address: LUXENI, abi: luxeniAbi, functionName: "teamPlayerCount", args: [BigInt(candidate), t], chainId: celo.id,
  })) : []), [candidate]);
  const { data: teamCounts } = useReadContracts({ contracts: teamCalls as any, query: { enabled: teamCalls.length > 0 } });

  // is the latest battlefield joinable (live + has space)?
  const now = Math.floor(Date.now() / 1000);
  const status = bfInfo ? Number((bfInfo as any)[0]) : 0;
  const endTime = bfInfo ? Number((bfInfo as any)[1]) : 0;
  const players = bfInfo ? Number((bfInfo as any)[2]) : 0;
  const joinable = candidate >= 1 && status === 1 && now < endTime && players < CAPACITY;
  const smallestTeam = useMemo(() => {
    if (!teamCounts) return 1;
    let best = 1, min = Infinity;
    for (let t = 0; t < 4; t++) {
      const c = Number((teamCounts[t]?.result as bigint | undefined) ?? 0n);
      if (c < min) { min = c; best = t + 1; }
    }
    return best;
  }, [teamCounts]);

  // which battlefield am I viewing/in
  const [bf, setBf] = useState<number>(0);
  useEffect(() => { if (joinable && bf === 0) setBf(candidate); }, [joinable, candidate, bf]);
  const { data: myTeam } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "playerTeam",
    args: address && bf ? [BigInt(bf), address] : undefined, chainId: celo.id, query: { enabled: !!address && !!bf },
  });
  const joined = Number(myTeam ?? 0) !== 0;

  // grid window
  const tileCalls = useMemo(() => {
    if (!bf) return [];
    const c = [];
    for (let y = 0; y < VIEW; y++) for (let x = 0; x < VIEW; x++)
      c.push({ address: LUXENI, abi: luxeniAbi, functionName: "tiles", args: [BigInt(bf), BigInt(y * WIDTH + x)], chainId: celo.id });
    return c as any;
  }, [bf]);
  const { data: tiles } = useReadContracts({ contracts: tileCalls, query: { enabled: tileCalls.length > 0 } });

  const wrongChain = isConnected && chainId !== celo.id;
  const [amount, setAmount] = useState("0.01");

  const findMatch = () => {
    if (joinable) { setBf(candidate); write("joinBattlefield", [BigInt(candidate), smallestTeam]); }
    else { write("createBattlefield"); } // no live match → start one; tap again to join once it's live
  };

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
          {errMsg && (
            <div style={{ ...card, borderColor: "#ff5b6e", background: "#2a1518", color: "#ffb3bb" }}>
              ⚠️ {errMsg.replace(/^.*reverted with the following reason:\s*/s, "").slice(0, 160)}
            </div>
          )}
          <div style={card}>
            <Row label="Wallet" value={`${address!.slice(0, 6)}…${address!.slice(-4)}`} />
            <Row label="Network" value={wrongChain ? "⚠️ Switch to Celo" : "Celo Mainnet"} />
            <Row label="Energy (free/paid)" value={energy ? `${energy[0]} / ${energy[1]} LUX` : "…"} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #2c3245", background: "#0e1118", color: "#fff" }} />
              <button disabled={busy} onClick={() => write("buyLux", [], parseEther(amount || "0"))} style={btn("#36d399")}>Buy LUX</button>
            </div>
            <button onClick={() => disconnect()} style={{ ...btn("transparent"), border: "1px solid #2c3245", color: "#8b93a7", width: "100%", marginTop: 10 }}>Disconnect</button>
          </div>

          {/* matchmaking */}
          {!joined && (
            <div style={card}>
              <p style={{ color: "#8b93a7", margin: "0 0 10px" }}>
                {joinable
                  ? `A live battle is on (#${candidate}, ${players}/${CAPACITY} players · 4 teams). Join the smallest team to keep it fair.`
                  : "No live battle right now — start one and others will join you."}
              </p>
              {teamCounts && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {[1, 2, 3, 4].map((t) => (
                    <div key={t} style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 8, background: "#0e1118", border: `1px solid ${TEAM_COLORS[t]}` }}>
                      <div style={{ color: TEAM_COLORS[t], fontWeight: 700 }}>T{t}</div>
                      <div style={{ fontSize: 12, color: "#8b93a7" }}>{Number((teamCounts[t - 1]?.result as bigint) ?? 0n)}</div>
                    </div>
                  ))}
                </div>
              )}
              <button disabled={busy} onClick={findMatch} style={{ ...btn(joinable ? "#5b8cff" : "#f5a524"), width: "100%", padding: 14 }}>
                {busy ? "…" : joinable ? `⚔️ Find Match — Join Team ${smallestTeam}` : "➕ Start a Battle"}
              </button>
            </div>
          )}

          {/* grid */}
          {joined && (
            <div style={{ ...card, padding: 12 }}>
              <p style={{ margin: "0 0 10px", color: "#8b93a7" }}>
                Battle #{bf} · You're <b style={{ color: TEAM_COLORS[Number(myTeam)] }}>Team {Number(myTeam)}</b>. Other colors = enemies. Tap an adjacent tile to claim (orthogonal only).
              </p>
              {energy && energy[0] + energy[1] === 0n && (
                <p style={{ margin: "0 0 10px", color: "#f5a524", fontSize: 13 }}>
                  ⚡ Out of energy — Buy LUX above (energy is shared across all your battles; it refills 1/20min).
                </p>
              )}
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
                10×10 window of the 80×80 board{busy ? " · confirming…" : ""}
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

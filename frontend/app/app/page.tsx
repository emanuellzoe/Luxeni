"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseEther } from "viem";
import {
  useAccount, useConnect, useDisconnect, useReadContract, useReadContracts,
  useSwitchChain, useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { celo } from "wagmi/chains";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletUI } from "../providers";
import {
  LUXENI, luxeniAbi, WIDTH, VIEW, TEAM_COLORS, TEAM_NAMES, CELOSCAN,
} from "../../lib/contract";
import { friendlyError, type FriendlyError } from "../../lib/errors";
import { Alert } from "../components/Alert";
import { TeamStandings, FullBoard } from "./_components/Leaderboard";

const CAPACITY = 100;

type MyBattle = {
  id: bigint; team: number; status: number; endTime: number;
  winningTeam: number; held: number; claimed: boolean;
};

export default function WarRoom() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { openConnect } = useWalletUI();
  const qc = useQueryClient();

  // MiniPay auto-connect: once per mount, via the CONFIGURED injected connector
  // (a fresh injected() instance would race wagmi's reconnect and break Disconnect).
  const autoTried = useRef(false);
  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    const inj = connectors.find((c) => c.id === "injected");
    if (eth?.isMiniPay && !isConnected && inj && !autoTried.current) {
      autoTried.current = true;
      connect({ connector: inj });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { writeContract, data: txHash, isPending: txPending, error: writeError } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });
  // Bumped on every confirmed tx so indexer-backed panels (leaderboard, full
  // board, team standings) refetch — they only read once per mount otherwise.
  const [refreshTick, setRefreshTick] = useState(0);
  // Celo RPC (and the indexer) lag behind a just-mined tx, so a single refetch
  // often reads stale state. Stagger several invalidations to catch up without
  // forcing the user to refresh by hand.
  useEffect(() => {
    if (!confirmed) return;
    const timers = [0, 1200, 3000, 6000, 10000].map((d) =>
      setTimeout(() => { qc.invalidateQueries(); setRefreshTick((n) => n + 1); }, d)
    );
    return () => timers.forEach(clearTimeout);
  }, [confirmed, qc]);
  const busy = txPending || confirming;

  // Surface any wallet/contract failure as a prominent, dismissible alert —
  // e.g. tapping a tile that already belongs to an enemy banner, or one not
  // adjacent to your ground. Keyed by message so each distinct error re-shows.
  const [alert, setAlert] = useState<FriendlyError | null>(null);
  useEffect(() => {
    const friendly = friendlyError(writeError) ?? friendlyError(receiptError);
    if (friendly) setAlert(friendly);
  }, [writeError, receiptError]);

  const write = (functionName: string, args: any[] = [], value?: bigint) =>
    writeContract({ address: LUXENI, abi: luxeniAbi, functionName, args, value, chainId: celo.id } as any);

  // --- reads ---
  const { data: season } = useReadContract({ address: LUXENI, abi: luxeniAbi, functionName: "currentSeason", chainId: celo.id });
  const { data: count } = useReadContract({ address: LUXENI, abi: luxeniAbi, functionName: "battlefieldCount", chainId: celo.id });
  const { data: energy } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "energyOf",
    args: address ? [address] : undefined, chainId: celo.id, query: { enabled: !!address },
  });
  const { data: myScore } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "seasonScore",
    args: address && season !== undefined ? [season, address] : undefined,
    chainId: celo.id, query: { enabled: !!address && season !== undefined },
  });

  // --- my battlefields, recovered from on-chain active slots ---
  const { data: slots } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "getActiveSlots",
    args: address ? [address] : undefined, chainId: celo.id, query: { enabled: !!address },
  });
  const slotIds = useMemo(
    () => ((slots as readonly bigint[] | undefined) ?? []).filter((s) => s !== 0n),
    [slots]
  );
  const slotCalls = useMemo(() => (address ? slotIds.flatMap((id) => [
    { address: LUXENI, abi: luxeniAbi, functionName: "playerTeam", args: [id, address], chainId: celo.id },
    { address: LUXENI, abi: luxeniAbi, functionName: "battlefields", args: [id], chainId: celo.id },
    { address: LUXENI, abi: luxeniAbi, functionName: "playerHeld", args: [id, address], chainId: celo.id },
    { address: LUXENI, abi: luxeniAbi, functionName: "scoreClaimed", args: [id, address], chainId: celo.id },
  ]) : []), [slotIds, address]);
  const { data: slotInfo } = useReadContracts({ contracts: slotCalls as any, query: { enabled: slotCalls.length > 0 } });

  const now = Math.floor(Date.now() / 1000);
  const myBattles: MyBattle[] = useMemo(() => slotIds.map((id, i) => {
    const team = Number((slotInfo?.[i * 4]?.result as number | undefined) ?? 0);
    const info = slotInfo?.[i * 4 + 1]?.result as any;
    const held = Number((slotInfo?.[i * 4 + 2]?.result as bigint | undefined) ?? 0n);
    const claimed = Boolean(slotInfo?.[i * 4 + 3]?.result ?? false);
    return {
      id, team, held, claimed,
      status: info ? Number(info[0]) : 0,
      endTime: info ? Number(info[1]) : 0,
      winningTeam: info ? Number(info[3]) : 0,
    };
  }).filter((b) => b.team !== 0), [slotIds, slotInfo]);

  const liveBattle = myBattles.find((b) => b.status === 1 && now < b.endTime);
  const endedBattles = myBattles.filter((b) => !(b.status === 1 && now < b.endTime));

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

  // viewed battlefield = my live battle (on-chain truth), or the one I just joined
  const [pendingBf, setPendingBf] = useState<number>(0);
  const bf = liveBattle ? Number(liveBattle.id) : pendingBf;
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
  const [luxOut, setLuxOut] = useState("100");
  const amountValid = /^(\d+\.?\d*|\.\d+)$/.test(amount) && Number(amount) > 0;

  const buyLux = () => {
    if (!amountValid) return;
    try { write("buyLux", [], parseEther(amount)); } catch { /* invalid decimals — button is disabled anyway */ }
  };

  const findMatch = () => {
    if (joinable) { setPendingBf(candidate); write("joinBattlefield", [BigInt(candidate), smallestTeam]); }
    else { write("createBattlefield"); } // no live match → start one; tap again to join once it's live
  };

  return (
    <main className="app-shell">
      <div className="fx-noise" />
      <Alert error={alert} onClose={() => setAlert(null)} />
      <div className="app-inner">
        <div className="app-head">
          <h1 className="app-title font-display">War Room</h1>
          <p className="app-sub">Season {season?.toString() ?? "…"} · Celo Mainnet · Territory War</p>
        </div>

        {!isConnected ? (
          <div className="panel gate">
            <div className="gate-numeral">✦</div>
            <p>
              The battlefield admits no nameless soldier. Bind your wallet to join a
              faction, claim tiles, and write your name into the season.
            </p>
            <button className="btn-outline gold" onClick={openConnect}>Connect Wallet</button>
          </div>
        ) : (
          <>
            {/* treasury */}
            <div className="panel">
              <p className="panel-label">The Treasury</p>
              <div className="row">
                <span className="lbl">Wallet</span>
                <span className="val">{address!.slice(0, 6)}…{address!.slice(-4)}</span>
              </div>
              <div className="row">
                <span className="lbl">Network</span>
                <span className="val">
                  {wrongChain ? (
                    <button
                      className="btn-outline small"
                      disabled={switching}
                      onClick={() => switchChain({ chainId: celo.id })}
                    >
                      {switching ? "Switching…" : "Switch to Celo"}
                    </button>
                  ) : "Celo Mainnet"}
                </span>
              </div>
              <div className="row">
                <span className="lbl">Energy · free / paid</span>
                <span className="val">{energy ? `${energy[0]} / ${energy[1]} LUX` : "…"}</span>
              </div>
              <div className="row">
                <span className="lbl">Season standing</span>
                <span className="val">{myScore !== undefined ? `${myScore} tiles held` : "…"}</span>
              </div>

              <div className="field-row">
                <input
                  className="input-dark" value={amount} inputMode="decimal"
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="CELO"
                />
                <button className="btn-outline small gold" disabled={busy || !amountValid} onClick={buyLux}>
                  Buy LUX
                </button>
              </div>
              <div className="field-row">
                <input
                  className="input-dark" value={luxOut} inputMode="numeric"
                  onChange={(e) => setLuxOut(e.target.value.replace(/[^0-9]/g, ""))} placeholder="LUX"
                />
                <button className="btn-outline small" disabled={busy || !luxOut || Number(luxOut) === 0}
                  onClick={() => write("withdrawLux", [BigInt(luxOut || "0")])}>
                  Withdraw
                </button>
              </div>
              <p className="board-note">1 CELO = 1,000 LUX · unused LUX returns to CELO at 1:1</p>
              <button
                className="btn-outline small"
                style={{ width: "100%", marginTop: 14, opacity: 0.7 }}
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>

            {/* matchmaking */}
            {!joined && (
              <div className="panel">
                <p className="panel-label">The Muster</p>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.8, margin: "0 0 6px" }}>
                  {joinable
                    ? <>A war rages on battlefield <b style={{ color: "var(--ink)" }}>#{candidate}</b> — {players}/{CAPACITY} warriors under four banners. You will join the smallest banner to keep the war fair.</>
                    : "No war rages at this hour. Raise a new battlefield, and others will rally to your banner."}
                </p>
                {teamCounts && (
                  <div className="team-grid">
                    {[1, 2, 3, 4].map((t) => (
                      <div key={t} className="team-cell" style={{ borderTopColor: TEAM_COLORS[t] }}>
                        <div className="t-name" style={{ color: TEAM_COLORS[t], filter: "brightness(1.6)" }}>
                          {TEAM_NAMES[t]}
                        </div>
                        <div className="t-count">{Number((teamCounts[t - 1]?.result as bigint) ?? 0n)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn-outline gold" style={{ width: "100%" }} disabled={busy} onClick={findMatch}>
                  {busy ? (joinable ? "Joining…" : "Raising Battlefield…") : joinable ? `⚔ Find Match — Join the ${TEAM_NAMES[smallestTeam]}` : "✦ Raise a Battlefield"}
                </button>
              </div>
            )}

            {/* battlefield */}
            {joined && (
              <div className="panel">
                <p className="panel-label">The Battlefield · #{bf}</p>
                <p style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.8, margin: "0 0 8px" }}>
                  You march under the{" "}
                  <b style={{ color: TEAM_COLORS[Number(myTeam)], filter: "brightness(1.6)" }}>
                    {TEAM_NAMES[Number(myTeam)]}
                  </b>{" "}
                  banner. Other colours are the enemy. Tap a tile orthogonally adjacent to
                  your ground to claim it.
                </p>
                {energy && energy[0] + energy[1] === 0n && (
                  <p style={{ color: "var(--gold)", fontSize: 12, lineHeight: 1.7, margin: "0 0 10px" }}>
                    ⚡ Your energy is spent — buy LUX in the Treasury above. Energy is shared
                    across all your battles and refills 1 LUX every 20 minutes.
                  </p>
                )}
                <div className="board" style={{ gridTemplateColumns: `repeat(${VIEW}, 1fr)` }}>
                  {Array.from({ length: VIEW * VIEW }).map((_, i) => {
                    const x = i % VIEW, y = Math.floor(i / VIEW);
                    const res = tiles?.[i]?.result as readonly [number, string] | undefined;
                    const team = res ? Number(res[0]) : 0;
                    return (
                      <button key={i} title={`(${x},${y})`} disabled={busy}
                        onClick={() => write("claimTile", [BigInt(bf), x, y])}
                        style={{ background: TEAM_COLORS[team] }} />
                    );
                  })}
                </div>
                <p className="board-note">
                  10×10 window of the 80×80 battlefield{busy ? " · the claim is being sealed…" : ""}
                </p>
              </div>
            )}

            {joined && bf ? <TeamStandings bf={Number(bf)} refresh={refreshTick} /> : null}
            {joined && bf ? <FullBoard bf={Number(bf)} refresh={refreshTick} /> : null}

            {/* ended battles — settle & claim season score */}
            {endedBattles.length > 0 && (
              <div className="panel">
                <p className="panel-label">Wars Concluded</p>
                {endedBattles.map((b) => (
                  <div key={b.id.toString()} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                      <b style={{ color: "var(--ink)" }}>Battle #{b.id.toString()}</b>
                      <br />
                      <span style={{ color: "var(--muted)" }}>
                        {b.status === 2
                          ? (b.winningTeam
                            ? <>The <b style={{ color: TEAM_COLORS[b.winningTeam], filter: "brightness(1.6)" }}>{TEAM_NAMES[b.winningTeam]}</b> banner triumphant</>
                            : "Settled — no victor")
                          : "The horn has sounded — awaiting judgement"}
                        {" · "}you hold {b.held} tile{b.held === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span style={{ flexShrink: 0 }}>
                      {b.status === 1 ? (
                        <button className="btn-outline small" disabled={busy}
                          onClick={() => write("settle", [b.id])}>
                          Seal the War
                        </button>
                      ) : b.claimed ? (
                        <span style={{ color: "var(--gold)", fontSize: 11, letterSpacing: "0.1em" }}>Score claimed ✦</span>
                      ) : b.held > 0 ? (
                        <button className="btn-outline small gold" disabled={busy}
                          onClick={() => write("claimMatchScore", [b.id])}>
                          Claim {b.held} pts
                        </button>
                      ) : (
                        <span style={{ color: "var(--faint)", fontSize: 11 }}>No tiles held</span>
                      )}
                    </span>
                  </div>
                ))}
                <p className="board-note">
                  Settling judges the map · claiming adds your held tiles to your season rank
                </p>
              </div>
            )}
          </>
        )}

        <p className="app-foot">
          <a href={`${CELOSCAN}/${LUXENI}#code`} target="_blank" rel="noreferrer">
            {LUXENI.slice(0, 10)}… · verified on Celoscan
          </a>
        </p>
      </div>
    </main>
  );
}

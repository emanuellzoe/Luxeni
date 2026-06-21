"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { celo } from "wagmi/chains";
import { useWalletUI } from "../providers";
import { LUXENI, luxeniAbi, CELOSCAN } from "../../lib/contract";
import { getLeaderboard, type Leaderboard } from "../../lib/indexer";

export default function ProfilePage() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnect } = useWalletUI();

  const { data: season } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "currentSeason", chainId: celo.id,
  });
  const { data: energy } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "energyOf",
    args: address ? [address] : undefined, chainId: celo.id, query: { enabled: !!address },
  });
  const { data: myScore } = useReadContract({
    address: LUXENI, abi: luxeniAbi, functionName: "seasonScore",
    args: address && season !== undefined ? [season, address] : undefined,
    chainId: celo.id, query: { enabled: !!address && season !== undefined },
  });

  // rank, pulled from the indexer-backed leaderboard for the active wallet
  const [board, setBoard] = useState<Leaderboard | null>(null);
  useEffect(() => {
    if (!address) { setBoard(null); return; }
    let on = true;
    getLeaderboard(undefined, address.toLowerCase())
      .then((d) => on && setBoard(d))
      .catch(() => on && setBoard(null));
    return () => { on = false; };
  }, [address]);

  const rank = board?.me?.rank;
  const wrongChain = isConnected && chainId !== celo.id;

  return (
    <main className="app-shell">
      <div className="fx-noise" />
      <div className="app-inner">
        <div className="app-head">
          <h1 className="app-title font-display">Profile</h1>
          <p className="app-sub">Season {season?.toString() ?? "…"} · Your Standing</p>
        </div>

        {!isConnected ? (
          <div className="panel gate">
            <div className="gate-numeral">✦</div>
            <p>
              No banner flies without a name. Bind your wallet to view your energy,
              your tiles, and your place among the warriors.
            </p>
            <button className="btn-outline gold" onClick={openConnect}>Connect Wallet</button>
          </div>
        ) : (
          <>
            <div className="panel">
              <p className="panel-label">The Warrior</p>

              <div className="profile-id">
                <span className="profile-sigil">✦</span>
                <a
                  className="profile-addr"
                  href={`${CELOSCAN}/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  title={address}
                >
                  {address!.slice(0, 6)}…{address!.slice(-4)}
                </a>
              </div>

              <div className="row">
                <span className="lbl">Network</span>
                <span className="val">{wrongChain ? "Wrong network" : "Celo Mainnet"}</span>
              </div>
              <div className="row">
                <span className="lbl">Energy · free / paid</span>
                <span className="val">{energy ? `${energy[0]} / ${energy[1]} LUX` : "…"}</span>
              </div>
              <div className="row">
                <span className="lbl">Season standing</span>
                <span className="val">{myScore !== undefined ? `${myScore} tiles held` : "…"}</span>
              </div>
              <div className="row">
                <span className="lbl">Rank this season</span>
                <span className="val">{rank ? `#${rank}` : "Unranked"}</span>
              </div>

              <button
                className="btn-outline small"
                style={{ width: "100%", marginTop: 16, opacity: 0.7 }}
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>

            <div className="panel">
              <p className="panel-label">The Banner</p>
              <p className="board-note" style={{ textAlign: "left", margin: "0 0 14px" }}>
                Return to the field to claim ground, or study where you stand among the season&apos;s warriors.
              </p>
              <div className="field-row">
                <Link href="/app" className="btn-outline gold" style={{ width: "100%" }}>▶ War Room</Link>
                <Link href="/leaderboard" className="btn-outline" style={{ width: "100%" }}>Leaderboard</Link>
              </div>
            </div>
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

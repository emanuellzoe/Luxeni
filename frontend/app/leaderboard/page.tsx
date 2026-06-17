"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  getLeaderboard, getSeasons,
  type Leaderboard, type Season,
} from "../../lib/indexer";
import { CELOSCAN } from "../../lib/contract";

const RANK_MARK = ["", "①", "②", "③"]; // 1st / 2nd / 3rd flourishes

export default function LeaderboardPage() {
  const { address } = useAccount();
  const me = address?.toLowerCase();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [season, setSeason] = useState<number | undefined>(undefined);
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  // available seasons (for the selector); default to the latest
  useEffect(() => {
    let on = true;
    getSeasons()
      .then((d) => {
        if (!on) return;
        setSeasons(d.seasons);
        if (d.seasons[0]) setSeason((s) => s ?? d.seasons[0].seasonId);
      })
      .catch(() => on && setSeasons([]));
    return () => { on = false; };
  }, []);

  // the ranking itself — refetched whenever the chosen season or wallet changes
  useEffect(() => {
    let on = true;
    setLoading(true);
    setErr("");
    getLeaderboard(season, me)
      .then((d) => { if (on) { setData(d); setLoading(false); } })
      .catch((e) => { if (on) { setErr(String(e)); setLoading(false); } });
    return () => { on = false; };
  }, [season, me, retryTick]);

  const meInTop = data?.top.some((r) => r.user === me);

  return (
    <main className="app-shell">
      <div className="fx-noise" />
      <div className="section-inner prose-section" style={{ position: "relative", zIndex: 2 }}>
        <div className="section-head" style={{ marginBottom: 36 }}>
          <p className="kicker">The Rolls of Glory</p>
          <h1 className="section-title font-display" style={{ fontSize: "clamp(30px, 6vw, 48px)" }}>
            Leaderboard
          </h1>
          <span className="ornament">✦</span>
          <p className="section-blurb">
            Warriors ranked by the territory they hold across the season. Every tile
            held when a war is settled is one point toward your name.
          </p>
          <Link href="/app" className="btn-outline gold">▶ Enter the War Room</Link>
        </div>

        {/* season selector */}
        {seasons.length > 1 && (
          <div className="lb-seasons">
            {seasons.map((s) => (
              <button
                key={s.seasonId}
                className={`lb-season-chip${s.seasonId === season ? " active" : ""}`}
                onClick={() => setSeason(s.seasonId)}
              >
                Season {s.seasonId}
              </button>
            ))}
          </div>
        )}

        <div className="panel">
          <p className="panel-label">
            Season {season ?? data?.season ?? "…"} · Top Warriors
          </p>

          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p className="board-note" style={{ margin: 0 }}>The rolls are offline — the indexer cannot be reached.</p>
              <button
                className="btn-outline small"
                onClick={() => { setErr(""); setLoading(true); setRetryTick((n) => n + 1); }}
              >
                Try again
              </button>
            </div>
          )}
          {loading && !err && <p className="board-note">Summoning the rolls…</p>}

          {!loading && !err && data && (
            <>
              {data.top.length === 0 ? (
                <p className="board-note">No names yet. Be the first to hold ground.</p>
              ) : (
                <div className="lb-list">
                  {data.top.map((r) => {
                    const isMe = me && r.user === me;
                    return (
                      <div key={r.user} className={`lb-row${isMe ? " me" : ""}${r.rank <= 3 ? " podium" : ""}`}>
                        <span className={`lb-rank r${r.rank <= 3 ? r.rank : ""}`}>
                          {RANK_MARK[r.rank] || r.rank}
                        </span>
                        <a
                          className="lb-user"
                          href={`${CELOSCAN}/${r.user}`}
                          target="_blank"
                          rel="noreferrer"
                          title={r.user}
                        >
                          {r.user.slice(0, 6)}…{r.user.slice(-4)}
                          {isMe && <span className="lb-you">you</span>}
                        </a>
                        <span className="lb-score">{r.score.toLocaleString()}<small> pts</small></span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* your standing, if you rank outside the visible top */}
              {data.me && me && !meInTop && (
                <div className="lb-row me detached">
                  <span className="lb-rank">{data.me.rank}</span>
                  <span className="lb-user">
                    {address!.slice(0, 6)}…{address!.slice(-4)}
                    <span className="lb-you">you</span>
                  </span>
                  <span className="lb-score">{data.me.score.toLocaleString()}<small> pts</small></span>
                </div>
              )}

              {data.top.length > 0 && (
                <p className="board-note">
                  Showing the top {data.top.length} · served by the indexer
                  {!me && " · connect your wallet to find your rank"}
                </p>
              )}
            </>
          )}
        </div>

        <p className="app-foot">Forged on Celo · MIT</p>
      </div>
    </main>
  );
}

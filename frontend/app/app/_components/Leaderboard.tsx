"use client";
import { useEffect, useState } from "react";
import { getLeaderboard, type Leaderboard } from "../../../lib/indexer";

export function LeaderboardPanel({ season, me }: { season?: number; me?: string }) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let on = true;
    getLeaderboard(season, me).then((d) => on && setData(d)).catch((e) => on && setErr(String(e)));
    return () => { on = false; };
  }, [season, me]);

  return (
    <div className="panel">
      <p className="panel-label">The Rolls of Glory</p>
      {err && <p className="board-note">leaderboard offline</p>}
      {!data && !err && <p className="board-note">…</p>}
      {data && (
        <>
          {data.top.length === 0 && <p className="board-note">No names yet. Be the first to hold ground.</p>}
          {data.top.map((r) => (
            <div key={r.user} className="row" style={{ opacity: me && r.user === me.toLowerCase() ? 1 : 0.85 }}>
              <span className="lbl">#{r.rank} · {r.user.slice(0, 6)}…{r.user.slice(-4)}</span>
              <span className="val">{r.score}</span>
            </div>
          ))}
          {data.me && !data.top.some((r) => r.user === me?.toLowerCase()) && (
            <div className="row" style={{ marginTop: 8 }}>
              <span className="lbl">#{data.me.rank} · you</span>
              <span className="val">{data.me.score}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

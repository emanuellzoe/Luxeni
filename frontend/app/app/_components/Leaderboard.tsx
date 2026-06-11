"use client";
import { useEffect, useState } from "react";
import {
  getLeaderboard, getTeams, getBattlefield,
  type Leaderboard, type TeamStanding, type BoardTile,
} from "../../../lib/indexer";
import { TEAM_NAMES, TEAM_COLORS } from "../../../lib/contract";

const W = 80;

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

export function TeamStandings({ bf }: { bf: number }) {
  const [teams, setTeams] = useState<TeamStanding[] | null>(null);
  useEffect(() => {
    if (!bf) return;
    let on = true;
    getTeams(bf).then((d) => on && setTeams(d.teams)).catch(() => on && setTeams(null));
    return () => { on = false; };
  }, [bf]);
  if (!teams) return null;
  return (
    <div className="panel">
      <p className="panel-label">Banners of Battlefield #{bf}</p>
      <div className="team-grid">
        {teams.map((t) => (
          <div key={t.team} className="team-cell" style={{ borderTopColor: TEAM_COLORS[t.team] }}>
            <div className="t-name" style={{ color: TEAM_COLORS[t.team], filter: "brightness(1.6)" }}>
              {TEAM_NAMES[t.team]}
            </div>
            <div className="t-count">{t.tiles} tiles · {t.players}p</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Full 80×80 overview reconstructed from the indexer's sparse tile set.
export function FullBoard({ bf }: { bf: number }) {
  const [tiles, setTiles] = useState<BoardTile[] | null>(null);
  useEffect(() => {
    if (!bf) return;
    let on = true;
    getBattlefield(bf).then((d) => on && setTiles(d.tiles)).catch(() => on && setTiles(null));
    return () => { on = false; };
  }, [bf]);
  if (!tiles) return null;

  const grid = new Array<number>(W * W).fill(0);
  for (const t of tiles) grid[t.y * W + t.x] = t.team;

  return (
    <div className="panel">
      <p className="panel-label">The War, Entire · #{bf}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${W}, 1fr)`,
          gridTemplateRows: `repeat(${W}, 1fr)`,
          aspectRatio: "1 / 1",
          width: "100%",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {grid.map((team, i) => (
          <div key={i} style={{ background: TEAM_COLORS[team] }} />
        ))}
      </div>
      <p className="board-note">{tiles.length} tiles claimed · full {W}×{W}, served by the indexer</p>
    </div>
  );
}

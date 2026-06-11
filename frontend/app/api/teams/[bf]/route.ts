import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { bf: string } }) {
  const bf = Number(params.bf);
  if (!Number.isInteger(bf) || bf < 1) return NextResponse.json({ error: "bad bf" }, { status: 400 });
  const sql = db();

  const tiles = await sql`SELECT team, COUNT(*)::int AS n FROM tiles WHERE bf = ${bf} GROUP BY team`;
  const players = await sql`SELECT team, COUNT(*)::int AS n FROM bf_players WHERE bf = ${bf} GROUP BY team`;
  const byTeam = (rows: any[]) => Object.fromEntries(rows.map((r) => [Number(r.team), Number(r.n)]));
  const t = byTeam(tiles), p = byTeam(players);

  return NextResponse.json(
    { bf, teams: [1, 2, 3, 4].map((team) => ({ team, tiles: t[team] ?? 0, players: p[team] ?? 0 })) },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
  );
}

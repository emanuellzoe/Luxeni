import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function latestSeason(sql: ReturnType<typeof db>): Promise<number> {
  const r = await sql`SELECT COALESCE(MAX(season_id), 1) AS s FROM seasons`;
  return Number(r[0].s);
}

export async function GET(req: Request) {
  const sql = db();
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season")) || (await latestSeason(sql));
  const me = url.searchParams.get("me")?.toLowerCase() || null;

  // ROW_NUMBER (not RANK) so tied scores still get distinct, sequential
  // positions — 1, 2, 3, 4 … — instead of every tie collapsing to one rank.
  // The "user" tiebreaker keeps the order stable and identical to the "me"
  // query below, so a wallet's standing matches its row in the top list.
  const top = await sql`
    SELECT "user", SUM(points)::bigint AS score,
           ROW_NUMBER() OVER (ORDER BY SUM(points) DESC, "user") AS rank
    FROM match_scores WHERE season = ${season}
    GROUP BY "user" ORDER BY score DESC, "user" LIMIT 100`;

  let meRow: { rank: number; score: number } | null = null;
  if (me) {
    const r = await sql`
      WITH ranked AS (
        SELECT "user", SUM(points) AS score,
               ROW_NUMBER() OVER (ORDER BY SUM(points) DESC, "user") AS rank
        FROM match_scores WHERE season = ${season} GROUP BY "user")
      SELECT rank, score FROM ranked WHERE "user" = ${me}`;
    if (r[0]) meRow = { rank: Number(r[0].rank), score: Number(r[0].score) };
  }

  return NextResponse.json(
    {
      season,
      top: top.map((r: any) => ({ rank: Number(r.rank), user: r.user, score: Number(r.score) })),
      me: meRow,
    },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
  );
}

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

  const top = await sql`
    SELECT "user", SUM(points)::bigint AS score,
           RANK() OVER (ORDER BY SUM(points) DESC) AS rank
    FROM match_scores WHERE season = ${season}
    GROUP BY "user" ORDER BY score DESC LIMIT 100`;

  return NextResponse.json(
    {
      season,
      top: top.map((r: any) => ({ rank: Number(r.rank), user: r.user, score: Number(r.score) })),
      me: null,
    },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
  );
}

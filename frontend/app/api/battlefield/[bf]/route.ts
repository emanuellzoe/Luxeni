import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { bf: string } }) {
  const bf = Number(params.bf);
  if (!Number.isInteger(bf) || bf < 1) return NextResponse.json({ error: "bad bf" }, { status: 400 });
  const sql = db();

  const meta = (await sql`
    SELECT bf, status, end_time AS "endTime", winning_team AS "winningTeam", season_id AS "seasonId"
    FROM battlefields WHERE bf = ${bf}`)[0] ?? null;
  const tiles = await sql`SELECT x, y, team, "owner" FROM tiles WHERE bf = ${bf}`;

  return NextResponse.json(
    { bf, meta, tiles },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
  );
}

import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = db();
  const rows = await sql`SELECT season_id AS "seasonId", end_time AS "endTime" FROM seasons ORDER BY season_id DESC`;
  return NextResponse.json(
    { seasons: rows.map((r: any) => ({ seasonId: Number(r.seasonId), endTime: Number(r.endTime) })) },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}

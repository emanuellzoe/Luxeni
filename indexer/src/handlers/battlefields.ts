import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { battlefields } from "../db/schema";

export async function onBfCreated(db: Db, ev: any): Promise<void> {
  const { bf, endTime, seasonId } = ev.args;
  await db.insert(battlefields).values({
    bf: Number(bf), status: 1, endTime: Number(endTime), winningTeam: 0, seasonId: Number(seasonId),
  }).onConflictDoNothing();
}

export async function onBfSettled(_db: Db, _ev: any): Promise<void> {
  /* implemented in PR4 (Task 12) */
}

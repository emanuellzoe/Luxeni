import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { bfPlayers } from "../db/schema";

export async function onTeamJoined(db: Db, ev: any): Promise<void> {
  const { bf, user, team } = ev.args;
  await db.insert(bfPlayers).values({
    bf: Number(bf), user: String(user).toLowerCase(), team: Number(team),
  }).onConflictDoUpdate({ target: [bfPlayers.bf, bfPlayers.user], set: { team: Number(team) } });
}

export async function onBfLeft(db: Db, ev: any): Promise<void> {
  const { bf, user } = ev.args;
  await db.delete(bfPlayers)
    .where(and(eq(bfPlayers.bf, Number(bf)), eq(bfPlayers.user, String(user).toLowerCase())));
}

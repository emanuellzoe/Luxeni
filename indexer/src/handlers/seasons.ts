import type { Db } from "../db/client";
import { matchScores, seasons } from "../db/schema";

export async function onMatchScoreClaimed(db: Db, ev: any): Promise<void> {
  const { bf, user, season, points } = ev.args;
  await db.insert(matchScores).values({
    bf: Number(bf), user: String(user).toLowerCase(), season: Number(season), points: Number(points),
  }).onConflictDoUpdate({
    target: [matchScores.bf, matchScores.user],
    set: { season: Number(season), points: Number(points) },
  });
}

export async function onSeasonRolled(_db: Db, _ev: any): Promise<void> {
  /* implemented in PR5 (Task 14) */
}

export async function seedSeason1(_db: Db, _seasonEnd: number): Promise<void> {
  /* implemented in PR5 (Task 14) */
}

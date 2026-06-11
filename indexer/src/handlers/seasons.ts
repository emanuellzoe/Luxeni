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

export async function onSeasonRolled(db: Db, ev: any): Promise<void> {
  const { newSeason, endTime } = ev.args;
  await db.insert(seasons).values({ seasonId: Number(newSeason), endTime: Number(endTime) })
    .onConflictDoUpdate({ target: seasons.seasonId, set: { endTime: Number(endTime) } });
}

// Season 1 has no SeasonRolled event (set in the constructor) — seed it from a contract read.
export async function seedSeason1(db: Db, seasonEnd: number): Promise<void> {
  await db.insert(seasons).values({ seasonId: 1, endTime: seasonEnd }).onConflictDoNothing();
}

import type { Db } from "../db/client";

export async function onSeasonRolled(_db: Db, _ev: any): Promise<void> {
  /* implemented in PR5 (Task 14) */
}

export async function onMatchScoreClaimed(_db: Db, _ev: any): Promise<void> {
  /* implemented in PR5 (Task 13) */
}

export async function seedSeason1(_db: Db, _seasonEnd: number): Promise<void> {
  /* implemented in PR5 (Task 14) */
}

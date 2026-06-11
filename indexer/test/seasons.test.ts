import { describe, it, expect } from "vitest";
import { testDb } from "./helpers";
import { onSeasonRolled, seedSeason1 } from "../src/handlers/seasons";
import { seasons } from "../src/db/schema";

describe("seasons", () => {
  it("seeds season 1 and records rollovers", async () => {
    const db = await testDb();
    await seedSeason1(db, 1752000000);
    await seedSeason1(db, 9999999999); // idempotent: season 1 unchanged
    await onSeasonRolled(db, { eventName: "SeasonRolled", blockNumber: 1n, logIndex: 0,
      args: { newSeason: 2, endTime: 1754000000n } } as any);
    const rows = await db.select().from(seasons);
    expect(rows.find((r) => r.seasonId === 1)?.endTime).toBe(1752000000);
    expect(rows.find((r) => r.seasonId === 2)?.endTime).toBe(1754000000);
  });
});

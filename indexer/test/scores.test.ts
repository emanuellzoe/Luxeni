import { describe, it, expect } from "vitest";
import { testDb } from "./helpers";
import { onMatchScoreClaimed } from "../src/handlers/seasons";
import { matchScores } from "../src/db/schema";

describe("onMatchScoreClaimed", () => {
  it("upserts one row per (bf,user)", async () => {
    const db = await testDb();
    const ev = { eventName: "MatchScoreClaimed", blockNumber: 1n, logIndex: 0,
      args: { bf: 2n, user: "0xAbC", season: 1, points: 5n } } as any;
    await onMatchScoreClaimed(db, ev);
    await onMatchScoreClaimed(db, ev); // idempotent
    const rows = await db.select().from(matchScores);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ bf: 2, user: "0xabc", season: 1, points: 5 });
  });
});

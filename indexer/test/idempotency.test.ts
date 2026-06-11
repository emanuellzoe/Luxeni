import { describe, it, expect } from "vitest";
import { testDb } from "./helpers";
import { applyEvents } from "../src/handlers";
import { tiles, matchScores, bfPlayers } from "../src/db/schema";

const batch = [
  { eventName: "TileClaimed", blockNumber: 1n, logIndex: 0, args: { bf: 1n, user: "0xA", x: 0, y: 0, team: 1, prevTeam: 0 } },
  { eventName: "TileClaimed", blockNumber: 2n, logIndex: 0, args: { bf: 1n, user: "0xB", x: 0, y: 0, team: 2, prevTeam: 1 } },
  { eventName: "TeamJoined", blockNumber: 1n, logIndex: 1, args: { bf: 1n, user: "0xA", team: 1 } },
  { eventName: "MatchScoreClaimed", blockNumber: 3n, logIndex: 0, args: { bf: 1n, user: "0xA", season: 1, points: 4n } },
] as any[];

describe("idempotency", () => {
  it("re-applying the same batch yields identical state", async () => {
    const db = await testDb();
    await applyEvents(db, [...batch]);
    await applyEvents(db, [...batch]); // replay (simulates overlap re-scan)
    const tileRows = await db.select().from(tiles);
    expect(tileRows.length).toBe(1);
    expect(tileRows[0]).toMatchObject({ team: 2, owner: "0xb" }); // block 2 wins
    expect((await db.select().from(matchScores)).length).toBe(1);
    expect((await db.select().from(bfPlayers)).length).toBe(1);
  });
});

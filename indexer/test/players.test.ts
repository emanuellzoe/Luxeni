import { describe, it, expect } from "vitest";
import { testDb } from "./helpers";
import { onTeamJoined, onBfLeft } from "../src/handlers/players";
import { bfPlayers } from "../src/db/schema";

describe("bf_players", () => {
  it("join inserts/updates team; leave deletes; both idempotent", async () => {
    const db = await testDb();
    const j = (team: number) => ({ eventName: "TeamJoined", blockNumber: 1n, logIndex: 0,
      args: { bf: 1n, user: "0xDd", team } } as any);
    await onTeamJoined(db, j(2));
    await onTeamJoined(db, j(3)); // rejoin updates team
    expect((await db.select().from(bfPlayers))[0]).toMatchObject({ bf: 1, user: "0xdd", team: 3 });
    await onBfLeft(db, { eventName: "BattlefieldLeft", blockNumber: 2n, logIndex: 0, args: { bf: 1n, user: "0xDd" } } as any);
    await onBfLeft(db, { eventName: "BattlefieldLeft", blockNumber: 2n, logIndex: 1, args: { bf: 1n, user: "0xDd" } } as any); // idempotent
    expect((await db.select().from(bfPlayers)).length).toBe(0);
  });
});

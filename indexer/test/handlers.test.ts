import { describe, it, expect } from "vitest";
import { eq, and } from "drizzle-orm";
import { testDb } from "./helpers";
import { onTileClaimed } from "../src/handlers/tiles";
import { onBfCreated, onBfSettled } from "../src/handlers/battlefields";
import { tiles, battlefields } from "../src/db/schema";

const tile = (x: number, y: number, team: number, owner: string, block: number, logIndex: number) =>
  ({ eventName: "TileClaimed", blockNumber: BigInt(block), logIndex,
     args: { bf: 1n, user: owner, x, y, team, prevTeam: 0 } } as any);

describe("onTileClaimed", () => {
  it("inserts then keeps newest by (block,logIndex)", async () => {
    const db = await testDb();
    await onTileClaimed(db, tile(3, 4, 1, "0xAAA", 10, 0));
    await onTileClaimed(db, tile(3, 4, 2, "0xBBB", 9, 9));   // older → ignored
    await onTileClaimed(db, tile(3, 4, 3, "0xCCC", 10, 1));  // newer → wins
    const row = (await db.select().from(tiles)
      .where(and(eq(tiles.bf, 1), eq(tiles.x, 3), eq(tiles.y, 4))))[0];
    expect(row.team).toBe(3);
    expect(row.owner).toBe("0xccc");
  });
});

describe("onBfCreated", () => {
  it("inserts a live row once (idempotent)", async () => {
    const db = await testDb();
    const ev = { eventName: "BattlefieldCreated", blockNumber: 1n, logIndex: 0,
      args: { bf: 7n, endTime: 1750000000n, seasonId: 1 } } as any;
    await onBfCreated(db, ev);
    await onBfCreated(db, ev); // idempotent
    const rows = await db.select().from(battlefields);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ bf: 7, status: 1, winningTeam: 0, seasonId: 1 });
  });
});

describe("onBfSettled", () => {
  it("updates status + winner", async () => {
    const db = await testDb();
    await onBfCreated(db, { eventName: "BattlefieldCreated", blockNumber: 1n, logIndex: 0,
      args: { bf: 7n, endTime: 1750000000n, seasonId: 1 } } as any);
    await onBfSettled(db, { eventName: "BattlefieldSettled", blockNumber: 2n, logIndex: 0,
      args: { bf: 7n, winningTeam: 3 } } as any);
    const row = (await db.select().from(battlefields).where(eq(battlefields.bf, 7)))[0];
    expect(row).toMatchObject({ status: 2, winningTeam: 3 });
  });
});

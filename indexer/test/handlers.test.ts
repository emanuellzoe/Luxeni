import { describe, it, expect } from "vitest";
import { eq, and } from "drizzle-orm";
import { testDb } from "./helpers";
import { onTileClaimed } from "../src/handlers/tiles";
import { tiles } from "../src/db/schema";

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

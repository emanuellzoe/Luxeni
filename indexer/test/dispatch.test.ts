import { describe, it, expect } from "vitest";
import { order, applyEvents } from "../src/handlers";
import { testDb } from "./helpers";

describe("applyEvents", () => {
  it("order() sorts by (block, logIndex)", () => {
    const e = (b: bigint, l: number) => ({ blockNumber: b, logIndex: l } as any);
    const sorted = [e(2n, 0), e(1n, 5), e(1n, 1)].sort(order);
    expect(sorted.map((x) => [Number(x.blockNumber), x.logIndex])).toEqual([[1, 1], [1, 5], [2, 0]]);
  });

  it("routes a mixed batch over real handlers (and ignores unknown events)", async () => {
    const db = await testDb();
    const n = await applyEvents(db, [
      { eventName: "TileClaimed", blockNumber: 1n, logIndex: 0,
        args: { bf: 1n, user: "0xA", x: 0, y: 0, team: 1, prevTeam: 0 } },
      { eventName: "SeasonRolled", blockNumber: 1n, logIndex: 1,
        args: { newSeason: 2, endTime: 100n } },
      { eventName: "Unknown", blockNumber: 2n, logIndex: 0, args: {} },
    ] as any);
    expect(n).toBe(3);
  });
});

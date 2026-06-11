import { describe, it, expect } from "vitest";
import { order, applyEvents } from "../src/handlers";

describe("applyEvents", () => {
  it("order() sorts by (block, logIndex)", () => {
    const e = (b: bigint, l: number) => ({ blockNumber: b, logIndex: l } as any);
    const sorted = [e(2n, 0), e(1n, 5), e(1n, 1)].sort(order);
    expect(sorted.map((x) => [Number(x.blockNumber), x.logIndex])).toEqual([[1, 1], [1, 5], [2, 0]]);
  });

  it("dispatches a mixed batch over stub handlers without throwing", async () => {
    const n = await applyEvents({} as any, [
      { eventName: "TileClaimed", blockNumber: 1n, logIndex: 0, args: {} },
      { eventName: "SeasonRolled", blockNumber: 1n, logIndex: 1, args: {} },
      { eventName: "Unknown", blockNumber: 2n, logIndex: 0, args: {} },
    ] as any);
    expect(n).toBe(3);
  });
});

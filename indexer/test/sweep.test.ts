import { describe, it, expect } from "vitest";
import { sweepLogs } from "../src/sweep";

const fakeClient = { getLogs: async () => [] } as any;

describe("sweepLogs", () => {
  it("chunks [from,to] inclusively", async () => {
    const ranges: Array<[number, number]> = [];
    for await (const c of sweepLogs(100, 250, fakeClient, 100)) ranges.push([c.from, c.to]);
    expect(ranges).toEqual([[100, 199], [200, 250]]);
  });
});

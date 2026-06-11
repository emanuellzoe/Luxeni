import { describe, it, expect } from "vitest";
import { getCursor, setCursor } from "../src/sweep";
import { testDb } from "./helpers";

describe("cursor", () => {
  it("returns fallback when unset, then persists", async () => {
    const db = await testDb();
    expect(await getCursor(db, 42220, 100)).toBe(100); // fallback
    await setCursor(db, 42220, 555);
    expect(await getCursor(db, 42220, 100)).toBe(555);
  });
});

import { eq } from "drizzle-orm";
import type { Db } from "./db/client";
import { syncState } from "./db/schema";

export async function getCursor(db: Db, chainId: number, fallback: number): Promise<number> {
  const rows = await db.select().from(syncState).where(eq(syncState.chainId, chainId));
  return rows[0]?.lastBlock ?? fallback;
}

export async function setCursor(db: Db, chainId: number, block: number): Promise<void> {
  await db.insert(syncState).values({ chainId, lastBlock: block })
    .onConflictDoUpdate({ target: syncState.chainId, set: { lastBlock: block } });
}

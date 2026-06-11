import { eq } from "drizzle-orm";
import { parseEventLogs, type Abi, type PublicClient } from "viem";
import type { Db } from "./db/client";
import { syncState } from "./db/schema";
import { LUXENI, abi, client as defaultClient } from "./chain";

export const CHUNK = 10_000;
export const FINALITY = 10;
export const OVERLAP = 50;

export async function getCursor(db: Db, chainId: number, fallback: number): Promise<number> {
  const rows = await db.select().from(syncState).where(eq(syncState.chainId, chainId));
  return rows[0]?.lastBlock ?? fallback;
}

export async function setCursor(db: Db, chainId: number, block: number): Promise<void> {
  await db.insert(syncState).values({ chainId, lastBlock: block })
    .onConflictDoUpdate({ target: syncState.chainId, set: { lastBlock: block } });
}

// Sweep [from, to] inclusively in fixed-size chunks (the public RPC caps getLogs ranges).
export async function* sweepLogs(
  from: number, to: number, client: PublicClient = defaultClient as PublicClient, chunk = CHUNK,
) {
  for (let start = from; start <= to; start += chunk) {
    const end = Math.min(start + chunk - 1, to);
    const logs = await client.getLogs({
      address: LUXENI, fromBlock: BigInt(start), toBlock: BigInt(end),
    });
    yield { from: start, to: end, events: parseEventLogs({ abi: abi as unknown as Abi, logs }) };
  }
}

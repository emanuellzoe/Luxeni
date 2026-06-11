import type { PublicClient } from "viem";
import { LUXENI } from "./chain";

// Binary-search the first block where the contract has code. Used once when
// DEPLOY_BLOCK is unset, so backfill starts at the contract's creation block.
export async function resolveDeployBlock(client: PublicClient, hint?: number): Promise<number> {
  if (hint) return hint;
  let lo = 0n;
  let hi = await client.getBlockNumber();
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const code = await client.getCode({ address: LUXENI, blockNumber: mid });
    if (code && code !== "0x") hi = mid; else lo = mid + 1n;
  }
  return Number(lo);
}

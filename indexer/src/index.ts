import type { Abi } from "viem";
import { env } from "./env";
import { client, CELO_MAINNET, LUXENI, abi } from "./chain";
import { makeDb } from "./db/client";
import { getCursor, setCursor, sweepLogs, FINALITY, OVERLAP } from "./sweep";
import { applyEvents } from "./handlers";
import { seedSeason1 } from "./handlers/seasons";
import { resolveDeployBlock } from "./deployBlock";

export async function run(): Promise<void> {
  const db = makeDb(env.databaseUrl);

  // Season 1 has no SeasonRolled event — seed it from the live contract.
  const seasonEnd = (await client.readContract({
    address: LUXENI, abi: abi as unknown as Abi, functionName: "seasonEnd",
  })) as bigint;
  await seedSeason1(db, Number(seasonEnd));

  const deploy = await resolveDeployBlock(client as any, env.deployBlock);
  const head = Number(await client.getBlockNumber()) - FINALITY;
  const cursor = await getCursor(db, CELO_MAINNET, deploy);
  const from = Math.max(deploy, cursor - OVERLAP); // overlap re-scan for reorg safety
  if (from > head) {
    console.log(`[indexer] up to date at ${head}`);
    return;
  }

  let total = 0;
  for await (const { to, events } of sweepLogs(from, head)) {
    total += await applyEvents(db, events);
    await setCursor(db, CELO_MAINNET, to);
  }
  console.log(`[indexer] swept ${from}..${head}, applied ${total} events`);
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

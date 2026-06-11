import { or, lt, and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { tiles } from "../db/schema";

export async function onTileClaimed(db: Db, ev: any): Promise<void> {
  const { bf, user, x, y, team } = ev.args;
  const block = Number(ev.blockNumber);
  const logIndex = Number(ev.logIndex);
  const row = {
    bf: Number(bf), x: Number(x), y: Number(y),
    team: Number(team), owner: String(user).toLowerCase(), block, logIndex,
  };
  // Last-write-wins: only overwrite when the incoming (block, logIndex) is newer.
  await db.insert(tiles).values(row).onConflictDoUpdate({
    target: [tiles.bf, tiles.x, tiles.y],
    set: { team: row.team, owner: row.owner, block, logIndex },
    where: or(lt(tiles.block, block), and(eq(tiles.block, block), lt(tiles.logIndex, logIndex))),
  });
}

import type { Db } from "../db/client";
import type { LuxeniEvent } from "../decode";
import { onTileClaimed } from "./tiles";
import { onBfCreated, onBfSettled } from "./battlefields";
import { onTeamJoined, onBfLeft } from "./players";
import { onSeasonRolled, onMatchScoreClaimed } from "./seasons";

type Ordered = { blockNumber: bigint | null; logIndex: number | null };

export function order(a: Ordered, b: Ordered): number {
  const ab = a.blockNumber ?? 0n, bb = b.blockNumber ?? 0n;
  if (ab !== bb) return Number(ab - bb);
  return (a.logIndex ?? 0) - (b.logIndex ?? 0);
}

export async function applyEvents(db: Db, events: LuxeniEvent[]): Promise<number> {
  const sorted = [...events].sort(order);
  for (const ev of sorted) {
    switch ((ev as any).eventName) {
      case "TileClaimed": await onTileClaimed(db, ev); break;
      case "BattlefieldCreated": await onBfCreated(db, ev); break;
      case "BattlefieldSettled": await onBfSettled(db, ev); break;
      case "TeamJoined": await onTeamJoined(db, ev); break;
      case "BattlefieldLeft": await onBfLeft(db, ev); break;
      case "MatchScoreClaimed": await onMatchScoreClaimed(db, ev); break;
      case "SeasonRolled": await onSeasonRolled(db, ev); break;
    }
  }
  return sorted.length;
}

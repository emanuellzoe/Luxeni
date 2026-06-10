import { parseEventLogs, type Log } from "viem";
import LuxeniAbi from "./abi/Luxeni.json";

/** All Luxeni event fragments (for viem parseEventLogs / watchers). */
export const LUXENI_EVENTS = (LuxeniAbi as readonly any[]).filter((x) => x.type === "event");

/** Events the leaderboard indexer + board renderer care about. */
export const TRACKED_EVENTS = [
  "TileClaimed",
  "BattlefieldCreated",
  "BattlefieldSettled",
  "TeamJoined",
  "MatchScoreClaimed",
  "SeasonRolled",
] as const;
export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

/** Decode raw logs into typed Luxeni events (board state, scores, lifecycle). */
export function parseLuxeniLogs(logs: Log[]) {
  return parseEventLogs({ abi: LuxeniAbi as any, logs });
}

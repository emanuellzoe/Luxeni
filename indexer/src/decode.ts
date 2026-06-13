import { type Log } from "viem";
import { parseLuxeniLogs } from "luxeni-sdk";

export function decode(logs: Log[]) {
  return parseLuxeniLogs(logs);
}
export type LuxeniEvent = ReturnType<typeof decode>[number];

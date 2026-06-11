import { parseEventLogs, type Abi, type Log } from "viem";
import { abi } from "./chain";

export function decode(logs: Log[]) {
  return parseEventLogs({ abi: abi as unknown as Abi, logs });
}
export type LuxeniEvent = ReturnType<typeof decode>[number];

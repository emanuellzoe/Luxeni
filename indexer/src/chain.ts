import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { env } from "./env";
import LuxeniAbi from "../abi/Luxeni.json";

export const CELO_MAINNET = 42220;
export const LUXENI = "0x82064c90A86BA16d81Dd1fb16374D78A70d59e70" as const;
export const abi = LuxeniAbi as unknown as readonly unknown[];

export const client = createPublicClient({ chain: celo, transport: http(env.rpcUrl) });

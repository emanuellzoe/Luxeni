import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { env } from "./env";
import { addresses, CELO_MAINNET as SDK_CELO_MAINNET, LuxeniAbi } from "luxeni-sdk";

export const CELO_MAINNET = SDK_CELO_MAINNET;
export const LUXENI = addresses[CELO_MAINNET].Luxeni;
export const abi = LuxeniAbi as unknown as readonly unknown[];

export const client = createPublicClient({ chain: celo, transport: http(env.rpcUrl) });

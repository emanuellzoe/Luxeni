import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Celo Mainnet only (chainId 42220). MiniPay injects window.ethereum → injected connector.
const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";

export const config = createConfig({
  chains: [celo],
  connectors: [injected()],
  transports: {
    [celo.id]: http(RPC),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

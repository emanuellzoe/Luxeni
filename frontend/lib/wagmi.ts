import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Celo Mainnet only (chainId 42220). MiniPay injects window.ethereum → injected connector.
export const config = createConfig({
  chains: [celo],
  connectors: [injected()],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

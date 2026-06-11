import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

// Celo Mainnet only (chainId 42220). MiniPay injects window.ethereum → injected connector.
// Installed browser wallets (MetaMask, Rabby, OKX, Phantom, …) are auto-discovered via
// EIP-6963 (multiInjectedProviderDiscovery, on by default) and listed in the connect modal.
const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://forno.celo.org";
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

export const config = createConfig({
  chains: [celo],
  ssr: true,
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Luxeni — Territory War" }),
    ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : []),
  ],
  transports: {
    [celo.id]: http(RPC),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

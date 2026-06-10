// Luxeni deployed addresses (auto-recorded). See celo-contracts/DEPLOYMENTS.md.
export const CELO_MAINNET = 42220 as const;
export const CELO_SEPOLIA = 11142220 as const;

export const addresses = {
  [CELO_MAINNET]: {
    Luxeni: "0x82064c90A86BA16d81Dd1fb16374D78A70d59e70",
    LuxeniKeepsake: "0x9e22Dff36a5494B6601C9ffAd57d78C26de6ca25",
  },
  // [CELO_SEPOLIA]: { Luxeni: "0x...", LuxeniKeepsake: "0x..." }, // TODO when deployed
} as const;

export const rpc = {
  [CELO_MAINNET]: "https://forno.celo.org",
  [CELO_SEPOLIA]: "https://forno.celo-sepolia.celo-testnet.org",
} as const;

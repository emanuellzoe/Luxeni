// Live, verified Luxeni contracts on Celo Mainnet (chainId 42220).
// (Will later switch to @luxeni/sdk; inlined here so the app is self-contained.)
export const LUXENI = "0x82064c90A86BA16d81Dd1fb16374D78A70d59e70" as const;
export const KEEPSAKE = "0x9e22Dff36a5494B6601C9ffAd57d78C26de6ca25" as const;

// Minimal ABI — enough to prove wiring + the core loop.
export const luxeniAbi = [
  { type: "function", name: "currentSeason", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "battlefieldCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "energyOf", stateMutability: "view",
    inputs: [{ name: "u", type: "address" }],
    outputs: [{ name: "free", type: "uint256" }, { name: "paid", type: "uint256" }],
  },
  { type: "function", name: "buyLux", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "createBattlefield", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "joinBattlefield", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }, { name: "team", type: "uint8" }], outputs: [],
  },
  {
    type: "function", name: "claimTile", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }, { name: "x", type: "uint16" }, { name: "y", type: "uint16" }], outputs: [],
  },
] as const;

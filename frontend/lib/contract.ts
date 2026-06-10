// Live, verified Luxeni contracts on Celo Mainnet (chainId 42220).
// (Will later switch to @luxeni/sdk; inlined here so the app is self-contained.)
export const LUXENI = (process.env.NEXT_PUBLIC_LUXENI ??
  "0x82064c90A86BA16d81Dd1fb16374D78A70d59e70") as `0x${string}`;
export const KEEPSAKE = (process.env.NEXT_PUBLIC_KEEPSAKE ??
  "0x9e22Dff36a5494B6601C9ffAd57d78C26de6ca25") as `0x${string}`;

export const luxeniAbi = [
  // reads
  { type: "function", name: "currentSeason", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "battlefieldCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "energyOf", stateMutability: "view",
    inputs: [{ name: "u", type: "address" }],
    outputs: [{ name: "free", type: "uint256" }, { name: "paid", type: "uint256" }],
  },
  {
    type: "function", name: "tiles", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
    outputs: [{ name: "team", type: "uint8" }, { name: "owner", type: "address" }],
  },
  {
    type: "function", name: "playerTeam", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "uint8" }],
  },
  {
    type: "function", name: "teamTiles", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint8" }], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "playerHeld", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "uint256" }],
  },
  // writes
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

export const WIDTH = 80;
export const VIEW = 10; // render a 10x10 window of the board
export const TEAM_COLORS = ["#1d2230", "#ff5b6e", "#5b8cff", "#36d399", "#f5a524"]; // 0=empty,1..4

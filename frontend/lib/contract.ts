// Live, verified Luxeni contracts on Celo Mainnet (chainId 42220).
// Addresses sourced from luxeni-sdk (single source of truth); env vars override.
import { addresses, CELO_MAINNET } from "luxeni-sdk";

export const LUXENI = (process.env.NEXT_PUBLIC_LUXENI ??
  addresses[CELO_MAINNET].Luxeni) as `0x${string}`;
export const KEEPSAKE = (process.env.NEXT_PUBLIC_KEEPSAKE ??
  addresses[CELO_MAINNET].LuxeniKeepsake) as `0x${string}`;

export const luxeniAbi = [
  // reads
  { type: "function", name: "currentSeason", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "seasonEnd", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
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
  {
    type: "function", name: "seasonScore", stateMutability: "view",
    inputs: [{ type: "uint32" }, { type: "address" }], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "cooldownEnd", stateMutability: "view",
    inputs: [{ type: "address" }], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "getActiveSlots", stateMutability: "view",
    inputs: [{ type: "address" }], outputs: [{ type: "uint256[3]" }],
  },
  {
    type: "function", name: "scoreClaimed", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "battlefields", stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "status", type: "uint8" }, { name: "endTime", type: "uint40" },
      { name: "playerCount", type: "uint16" }, { name: "winningTeam", type: "uint8" },
      { name: "seasonId", type: "uint32" },
    ],
  },
  {
    type: "function", name: "teamPlayerCount", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint8" }], outputs: [{ type: "uint16" }],
  },
  // writes
  { type: "function", name: "buyLux", stateMutability: "payable", inputs: [], outputs: [] },
  {
    type: "function", name: "withdrawLux", stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }], outputs: [],
  },
  { type: "function", name: "createBattlefield", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "joinBattlefield", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }, { name: "team", type: "uint8" }], outputs: [],
  },
  {
    type: "function", name: "leaveBattlefield", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }], outputs: [],
  },
  {
    type: "function", name: "claimTile", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }, { name: "x", type: "uint16" }, { name: "y", type: "uint16" }], outputs: [],
  },
  {
    type: "function", name: "settle", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }], outputs: [],
  },
  {
    type: "function", name: "claimMatchScore", stateMutability: "nonpayable",
    inputs: [{ name: "bf", type: "uint256" }], outputs: [],
  },
] as const;

export const WIDTH = 80;
export const VIEW = 10; // render a 10x10 window of the board
export const TEAM_COLORS = ["#16161d", "#a8323e", "#3d5a96", "#2e7d5b", "#b08938"]; // 0=empty, 1..4 factions
export const TEAM_NAMES = ["—", "Crimson", "Azure", "Verdant", "Gilded"];
export const CELOSCAN = "https://celoscan.io/address";

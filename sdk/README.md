# luxeni-sdk

Shared TypeScript surface for **Luxeni** (an on-chain territory-war game on Celo):
**deployed addresses, ABIs, RPC endpoints, and event helpers**. Consumed by the
Luxeni frontend and the leaderboard indexer.

## Install

```bash
npm install luxeni-sdk viem
```

> `viem` is a peer dependency.

## Usage

```ts
import {
  addresses,
  rpc,
  CELO_MAINNET,
  LuxeniAbi,
  LuxeniKeepsakeAbi,
  parseLuxeniLogs,
  TRACKED_EVENTS,
} from "luxeni-sdk";

const game = addresses[CELO_MAINNET].Luxeni; // 0x82064c90...
const events = parseLuxeniLogs(logs);        // typed Luxeni events
```

## Exports

- `addresses` — deployed contract addresses per chain.
- `rpc` — RPC endpoints per chain.
- `CELO_MAINNET`, `CELO_SEPOLIA` — chain ids.
- `LuxeniAbi`, `LuxeniKeepsakeAbi` — contract ABIs.
- `LUXENI_EVENTS`, `TRACKED_EVENTS`, `parseLuxeniLogs` — event helpers.

## Notes

- ABIs are generated from `celo-contracts/out/*`. Regenerate after contract changes:
  `forge build`, then copy `out/Luxeni.sol/Luxeni.json` into `src/abi`.
- Addresses sourced from `celo-contracts/DEPLOYMENTS.md` (Celo Mainnet 42220, verified).

## License

MIT

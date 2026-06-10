# @luxeni/sdk

Shared TypeScript surface for Luxeni: **deployed addresses, ABIs, and RPC endpoints**.
Consumed by `frontend/` and the leaderboard indexer.

```ts
import { addresses, rpc, CELO_MAINNET, LuxeniAbi, LuxeniKeepsakeAbi } from "@luxeni/sdk";

const game = addresses[CELO_MAINNET].Luxeni; // 0x82064c90...
```

- ABIs are generated from `celo-contracts/out/*`. Regenerate after contract changes:
  `forge build` then copy `out/Luxeni.sol/Luxeni.json -> abi`.
- Addresses sourced from `celo-contracts/DEPLOYMENTS.md` (Celo Mainnet 42220, verified).

## TODO
- [ ] Typed viem/wagmi contract config helpers
- [ ] Event decoders (`TileClaimed`, `BattlefieldSettled`, `MatchScoreClaimed`) for the indexer
- [ ] Add Celo Sepolia addresses once a QA deploy exists

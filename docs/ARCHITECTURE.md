# Luxeni Architecture

```
User wallet (MiniPay/injected)
        │  signs tx
        ▼
Frontend (Next.js + wagmi/viem)  ──reads──►  Celo RPC (forno.celo.org)
        │                                         │
        └──────────── writes ────────────────────┘
                          ▼
        Luxeni.sol  (Celo Mainnet, 42220, verified)
        ├─ energy economy (LUX: buy/withdraw/regen, anti-whale)
        ├─ battlefields + matchmaking (create/join/leave/settle)
        └─ seasons (claimMatchScore, rollover, archive)
        LuxeniKeepsake.sol (season NFT, upgradeable art)

Indexer (optional) ── reads events ──► sorted leaderboard for the UI
```

## Key properties
- **No backend required** for tx/DAU: the frontend talks directly to the contract.
- Board is reconstructed from `TileClaimed` events (not bulk tile reads).
- Leaderboard truth is on-chain (`seasonScore`); the indexer only sorts/serves it.
- Energy is **per-user** (shared across battlefields) — multiple battles ≠ more free energy.

## Contracts
See `celo-contracts/DEPLOYMENTS.md` for live addresses and `docs/specs/` for planned modules.

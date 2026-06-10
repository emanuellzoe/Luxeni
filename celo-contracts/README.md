# Luxeni — Celo Contracts (Solidity / Foundry)

Smart contracts for **Luxeni**, the on-chain Territory War game. See the root [`PRD.md`](../PRD.md) for the full spec.

## Status
- ✅ `src/Luxeni.sol` — core MVP: LUX energy economy (buy/withdraw/regen), 4-team contiguous tile claiming, anti-whale surcharge, per-battlefield tile + held-tile tracking. Events for off-chain leaderboard indexing.
- 🗺️ TODO modules: `BattlefieldFactory` (dynamic/sponsored battlefields), `SeasonRegistry` (season scores + archive), `LuxeniKeepsake` (upgradeable-art NFT), zone tallies, UUPS upgradeability wrapping.

## Quick start
```bash
forge build      # compile
forge test -vv   # run tests (5 passing)
```
`forge-std` is vendored, so a fresh `git clone` builds without extra setup.

## Key parameters (MVP defaults — see PRD §6–7)
| Param | Value |
|---|---|
| Teams | 4 · Board 80×80 |
| Buy rate | 1 CELO = 1000 LUX |
| Claim empty / enemy | 1 / 3 LUX |
| Free regen | 1 / 20 min, cap 10 (+10 starter) |
| Anti-whale | first 20 claims / 5h base, then +1 LUX each (per-user) |
| Withdraw | unused purchased LUX → CELO 1:1 (refundable) |

## Contract surface (for FE/SDK)
- `buyLux() payable`, `withdrawLux(uint256)`, `energyOf(address) → (free, paid)`
- `joinTeam(uint256 bf, uint8 team)`, `claimTile(uint256 bf, uint16 x, uint16 y)`
- views: `tiles(bf, idx)`, `teamTiles(bf, team)`, `playerHeld(bf, user)`, `playerTeam(bf, user)`
- events: `LuxBought`, `LuxWithdrawn`, `TeamJoined`, `TileClaimed` (reconstruct the board from these)

## Deploy (after filling `.env`)
```bash
forge create src/Luxeni.sol:Luxeni --rpc-url alfajores --account <key> --verify
```

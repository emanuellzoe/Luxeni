# Luxeni — Celo Contracts (Solidity / Foundry)

Smart contracts for **Luxeni**, the on-chain Territory War game. See the root [`PRD.md`](../PRD.md) for the full spec.

## 🟢 Live on Celo Mainnet (chainId 42220) — verified
| Contract | Address |
|---|---|
| `Luxeni` | [`0x82064c90A86BA16d81Dd1fb16374D78A70d59e70`](https://celoscan.io/address/0x82064c90a86ba16d81dd1fb16374d78a70d59e70#code) |
| `LuxeniKeepsake` | [`0x9e22Dff36a5494B6601C9ffAd57d78C26de6ca25`](https://celoscan.io/address/0x9e22dff36a5494b6601c9ffad57d78c26de6ca25#code) |

Full details in [`DEPLOYMENTS.md`](./DEPLOYMENTS.md).

## Status
- ✅ `src/Luxeni.sol` — core MVP: LUX energy economy (buy/withdraw/regen), 4-team contiguous tile claiming, anti-whale surcharge, per-battlefield tile + held-tile tracking, **battlefield lifecycle + matchmaking** (create / join / leave / settle, 3-concurrent slots, 10-min re-queue cooldown, 3h matches, team caps), and a **season layer** (4-week seasons, lazy per-player score claim of tiles-held-at-end, forfeit-on-leave, permissionless rollover, archived by `seasonId`). Events for off-chain leaderboard indexing. **12 Foundry tests passing.**
- ✅ `src/LuxeniKeepsake.sol` — season keepsake **NFT** (ERC721). One mint per (player, finished season) with score on-chain. **Upgradeable art**: swappable `renderer` + `baseURI` until `freezeSeasonArt(season)` locks a season's art forever. **6 Foundry tests passing.**
- 🗺️ TODO modules: zone tallies (zone-based win condition), UUPS upgradeability wrapping. (BattlefieldFactory + SeasonRegistry responsibilities are folded into `Luxeni.sol` for MVP cohesion.)

**Total: 18 Foundry tests passing.** Built with `evm_version = cancun` (Celo L2 / OP-stack) and OpenZeppelin v5 (vendored).

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
- energy: `buyLux() payable`, `withdrawLux(uint256)`, `energyOf(address) → (free, paid)`
- battlefields: `createBattlefield() → bf`, `joinBattlefield(bf, team)`, `leaveBattlefield(bf)`, `settle(bf)`
- play: `claimTile(uint256 bf, uint16 x, uint16 y)`
- seasons: `claimMatchScore(bf)`, `rolloverSeason()`, views `currentSeason()`, `seasonEnd()`, `seasonScore(season, user)`
- keepsake NFT (`LuxeniKeepsake`): `mint(season)`, `tokenURI(id)`, owner art controls `setRenderer`/`setBaseURI`/`freezeSeasonArt(season)`
- views: `battlefields(bf)`, `getActiveSlots(user)`, `tiles(bf, idx)`, `teamTiles(bf, team)`, `teamPlayerCount(bf, team)`, `playerHeld(bf, user)`, `playerTeam(bf, user)`
- events: `BattlefieldCreated`, `TeamJoined`, `BattlefieldLeft`, `BattlefieldSettled`, `TileClaimed`, `MatchScoreClaimed`, `SeasonRolled`, `LuxBought`, `LuxWithdrawn` (reconstruct board + leaderboard from these)

## Deploy (after filling `.env`)
Deploys `Luxeni` + `LuxeniKeepsake`.
```bash
# Mainnet — Celo (chainId 42220), where Proof of Ship metrics count
forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify --verifier sourcify

# Testnet QA — Celo Sepolia (chainId 11142220). NOT Alfajores.
forge script script/Deploy.s.sol --rpc-url celo_sepolia --broadcast
```

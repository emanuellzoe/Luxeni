# Luxeni — Product Requirements Document (PRD)

> **Status:** Design / early-MVP · **Owner:** @emanuellzoe · **Last updated:** 2026-06-10
> **Targets:** **Celo first** (Solidity) → **Stacks next** (Clarity). Stacks begins only after the Celo build is on-chain and submitted.

---

## 1. Vision
Luxeni is a **mobile-first, multiplayer territory-war game** where four teams fight to control a shared pixel battlefield. Every tile claimed is a real on-chain transaction. It is designed so that **high transaction volume and high daily active users emerge from genuine play** — not from bots or metric farming — making it a strong, *defensible* entry for Talent-tracked builder-reward programs on both **Celo** and **Stacks**.

## 2. Goals & non-goals
**Goals**
- A casual-competitive game that is fun for its own sake (no gambling framing).
- Honest, sustained on-chain activity: many transactions from many distinct, real players.
- Ship the **same game on two chains** (Celo + Stacks) from one monorepo.
- Be a credible submission to **Celo builder rewards (Proof of Ship / Talent)** and **Stacks Builder Rewards**.

**Non-goals**
- ❌ Not gambling / wagering / lottery.
- ❌ No monetary payout to winners in the base game.
- ❌ No bot-generated mainnet metrics (bots are testnet load-testing only).
- ❌ No new speculative/tradeable token (LUX is internal, non-transferable energy).

## 3. Target users & platforms
- **Primary users:** MiniPay users (Celo) and Stacks-wallet / Farcaster users — mobile-first, self-custodial, emerging-market friendly.
- **Platforms:** MiniApp inside MiniPay (Celo), Stacks wallet web app, Farcaster MiniApp (planned).
- **Auto-connect** inside MiniPay (`window.ethereum.isMiniPay`); native wallet connect on Stacks.

## 4. Target programs (dual)
| Program | Chain | Contract | Asset | Notes |
|---|---|---|---|---|
| Celo Proof of Ship / Talent Builder Rewards | Celo | Solidity (EVM) | CELO native | MiniApp for MiniPay; verified on Celoscan |
| Stacks Builder Rewards (Talent) | Stacks | Clarity | STX | Clarinet project; same game logic |

Reward signals for both: **Transactions, Gas/fees, DAU**, plus open-source + verified contracts. Luxeni is built to lift all three **organically**.

## 5. Core gameplay loop
```
JOIN TEAM  → pick 1 of 4 factions for this battlefield
CLAIM      → spend energy (LUX) to claim a tile ADJACENT to your team  [1 tx each]
REGEN/BUY  → energy regenerates free; buy more with CELO/STX when war heats up
HOLD       → at match end, tiles your team still controls decide the winner
RANK       → tiles YOU still hold feed your season rank
KEEPSAKE   → at season end, mint an NFT snapshot of the war
```

## 6. Detailed mechanics
| Parameter | MVP default | Rationale |
|---|---|---|
| Teams | **4** | small = bounded on-chain loops; clear rivalry |
| Board | ~**80×80** | gas paid only for *claimed* tiles (sparse mapping) |
| Capacity | ~**100** players / battlefield | dense enough to be lively, not cramped |
| Match duration | **3 hours** (Hybrid tempo) | enough activity windows; not idle-boring, not blitz-only |
| Concurrent battlefields / user | **3** | more fun than waiting; energy shared so it's strategic, not a multiplier |
| Sequential matches | **unlimited** | naturally bounded by duration + energy |
| Re-queue cooldown | **10 min** | prevents rage-quit / rejoin spam |
| Expansion | **contiguous** (adjacent only) | feels like "expanding territory"; anti random-spam |
| Win condition | team holding most **zones/tiles** at end | skill of capture + defense |
| Lifecycle | `OPEN → ACTIVE → SETTLED` (`CANCELLED` if unfilled) | |

**Zone control (no unbounded loops):** the board is split into zones; each zone keeps **incremental per-team counters** updated O(1) on every claim. A zone's controlling team and the season tally are updated incrementally — never by iterating all tiles.

## 7. Energy economy (LUX)
LUX is an **internal, non-transferable, refundable energy credit** — not a token.

| Rule | MVP default |
|---|---|
| Free regen | **1 LUX / 20 min**, cap **10** |
| Buy rate | **1 CELO (or STX) = 1,000 LUX** (fixed, no oracle in MVP) |
| Claim empty tile | **1 LUX** |
| Claim enemy tile | **3 LUX** |
| Anti-whale (per user, rolling 5h) | first **20** claims base; each further claim **+1 LUX** cumulative; resets per window; counted **per-user across all battlefields** |
| Withdraw | unused LUX → CELO/STX at **1:1** (refundable) |

> **Anti-gambling guarantee:** pay to build/expand (not wager), no randomness, refundable unused LUX, no monetary payout to winners. See §16.

## 8. Seasons, ranks & leaderboard
- **Season** = **4 weeks**, aggregates per-match results into a **global rank**.
- **Rank metric** = **tiles still controlled at the end of each match** (rewards holding, not spam).
- **Leaderboard:** Top **100** global + **your own position** highlighted + **4 team standings** + live **battlefield** board. Filter by current/archived season.
- **Persistence:** scores stored/derivable on-chain per `seasonId` → **past seasons viewable forever**.
- **Backend:** on-chain is source of truth; a **lightweight indexer** reads chain + serves the *sorted* leaderboard (sorting on-chain would be a gas bomb). The indexer cannot fake data — scores are verifiable on-chain.

## 9. Keepsake NFT (upgradeable art)
- Minted **at season end**, claimable to wallet, shown in **Profile**.
- Art = generative snapshot of the final battlefield + rank badge (Champion / Top 10 / Participant).
- **Art is upgradeable after deploy:** mutable `tokenURI` via an **upgradeable render contract** (since the art direction is finalised later), with a per-season **`freeze()`** once art is locked → flexibility now, collector trust later.
- Storage: **IPFS** for finalised art.

## 10. Multi-chain architecture (two smart contracts)
Following the chessxu pattern — **same game, per-chain contract, shared frontend + SDK**:

```text
luxeni/
├── frontend/          # Next.js/React MiniApp (MiniPay + Stacks + Farcaster), shared UI
├── celo-contracts/    # Hardhat/Foundry — Solidity (EVM) for Celo
├── stacks-contracts/  # Clarinet — Clarity for Stacks
├── sdk/               # TypeScript SDK — chain-agnostic game/leaderboard helpers
└── docs/              # PRD, events, architecture
```

| Concern | Celo | Stacks | Shared |
|---|---|---|---|
| Language | Solidity | Clarity | — |
| Tooling | Hardhat/Foundry | Clarinet | — |
| Deposit asset | CELO native | STX | — |
| Wallet | MiniPay | Stacks wallet | Farcaster MiniApp |
| Game rules / board / render | — | — | ✅ frontend + SDK |
| Leaderboard indexer | reads Celo | reads Stacks | ✅ unified UI |

The two contracts implement the **same state machine** (energy, claims, battlefields, seasons). Numbers (rates, costs) are identical so the experience matches across chains.

## 11. Smart-contract spec
**Solidity (Celo) — modules:**
- **`Luxeni` (UUPS upgradeable)**: `buyLux() payable`, `withdrawLux(amount)`, `joinTeam(battlefieldId, team)`, `claimTile(battlefieldId, x, y)`; storage `lux[user]`, `tile[bf][index]`, `nextRegen[user]`, `windowClaims[user]`, `zoneTeamCount[bf][zone][team]`, `teamZoneTally[bf][team]`. All O(1); history via `TileClaimed` events.
- **`BattlefieldFactory` (upgradeable)**: dynamic battlefield creation on matchmaking demand; sponsored/event battlefields.
- **`SeasonRegistry`**: per-season per-player held-tile scores; archived by `seasonId`.
- **`LuxeniKeepsake` (NFT, upgradeable render)**: season keepsake mint; mutable `tokenURI` → `freeze()`.

**Clarity (Stacks) — mirror:** equivalent maps + public functions (`buy-lux`, `withdraw-lux`, `join-team`, `claim-tile`), same constants, same state machine; STX as deposit asset.

**Safety (both):** CEI ordering + reentrancy protection (Solidity); no unbounded loops (incremental counters); bounds/cooldown/balance checks; upgrades via **timelock + multisig**.

Events (indexed): `LuxBought`, `LuxWithdrawn`, `TeamJoined`, `TileClaimed`, `BattlefieldCreated`, `BattlefieldSettled`, `SeasonClosed`, `KeepsakeMinted`.

## 12. Integrity & anti-abuse
- **3-concurrent + 10-min cooldown** bounds parallel play.
- **Energy per-user** → multiple battlefields share one pool (no free multiplier).
- **Anti-whale per-user** → escalation persists across battlefields.
- **Bots = testnet (Alfajores) load-testing only** → never submitted as mainnet activity.
- **Self / proof-of-personhood**: deferred; **required** for any future money-prize event.

## 13. Metrics & success criteria
- **Transactions/day**, **Gas/day**, **DAU (distinct wallets/day)**.
- Tiles claimed/season, weekly retention, avg claims/user, % returning within 24h.
- Health guard: ratio of distinct wallets to total tx (detect unnatural concentration).

## 14. Tech stack
Solidity · Hardhat/Foundry · OpenZeppelin · Clarity · Clarinet · Next.js/React · TypeScript · Tailwind · viem/wagmi · `@stacks/connect` · MiniPay · Farcaster · IPFS · lightweight event indexer.

## 15. Milestones
- **M1 — Celo MVP (current focus):** LUX economy, battlefields, 4-team war, matchmaking, season ranks, leaderboard, verified on Celo Mainnet, **deployed on-chain and submitted**. Stacks does **not** start until this is done.
- **M2 — Stacks build (after M1 ships):** Clarity port (`stacks-contracts/`), Stacks wallet integration, deploy for Stacks Builder Rewards.
- **M3 — Polish:** Keepsake NFT (finalised art), Farcaster MiniApp, archived-season views.
- **M4 — Events:** sponsored skill-contest battlefields (Self/KYC-gated, sponsor-funded prizes), brand collabs; optional Pyth oracle for stable USD pricing.

## 16. Compliance
Base game = **skill-based, not gambling**: pay energy to build/expand (not wager), skill-driven outcomes, refundable unused LUX, no monetary payout to winners. Future **sponsored money-prize events** will be **skill contests**: prize **funded by sponsor** (not player deposits), winners by skill, eligibility **identity-verified**, restricted jurisdictions excluded. **Jurisdiction-dependent; not legal advice.**

## 17. Open questions
- Exact board size / capacity tuning after first load-test.
- Whether Farcaster MiniApp ships in M1 or M3.
- Oracle (Pyth) vs fixed rate — fixed for MVP; revisit if CELO/STX volatility hurts UX.

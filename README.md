# 🎨 Luxeni — On-chain Territory War

> **Claim. Defend. Conquer. Every tile is a transaction.**

**Luxeni is a mobile-first, multiplayer territory-war game where four teams fight to control a shared pixel battlefield — built as a MiniApp for MiniPay on Celo, with a parallel Clarity build for Stacks.**

![Status](https://img.shields.io/badge/status-design%20%2F%20MVP%20scaffold-yellow)
![Chain](https://img.shields.io/badge/chain-Celo-FCFF52)
![Chain](https://img.shields.io/badge/chain-Stacks-5546FF)
![Wallet](https://img.shields.io/badge/wallet-MiniPay-2775CA)
![Contracts](https://img.shields.io/badge/contracts-Solidity%20%2B%20Clarity-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

> **✅ Status:** The **Celo MVP contracts are LIVE & verified on Celo Mainnet** (chainId 42220):
> `Luxeni` [`0x82064c90…59e70`](https://celoscan.io/address/0x82064c90a86ba16d81dd1fb16374d78a70d59e70#code) ·
> `LuxeniKeepsake` [`0x9e22Dff3…6ca25`](https://celoscan.io/address/0x9e22dff36a5494b6601c9ffad57d78c26de6ca25#code).
> Frontend + Stacks build are next. See [`PRD.md`](./PRD.md) and [`celo-contracts/DEPLOYMENTS.md`](./celo-contracts/DEPLOYMENTS.md). Component status uses a legend so nothing is overclaimed.
>
> **Legend:** ✅ implemented · 🚧 in progress · 🗺️ planned

---

## Table of Contents
1. [One-liner](#one-liner)
2. [Problem](#problem)
3. [Solution](#solution)
4. [How a match works](#how-a-match-works)
5. [The energy economy (LUX)](#the-energy-economy-lux)
6. [Seasons, ranks & keepsakes](#seasons-ranks--keepsakes)
7. [Why Luxeni fits builder-reward programs](#why-luxeni-fits-builder-reward-programs)
8. [Multi-chain architecture](#multi-chain-architecture)
9. [Smart-contract design](#smart-contract-design)
10. [Integrity & anti-abuse](#integrity--anti-abuse)
11. [Tech stack](#tech-stack)
12. [Repository structure](#repository-structure)
13. [Roadmap](#roadmap)
14. [Compliance disclaimer](#compliance-disclaimer)
15. [License](#license)

---

## One-liner
Luxeni is a casual-competitive **territory-war** game: join one of **four teams**, spend **energy** to claim adjacent tiles on a shared battlefield, and at the end of each match the tiles your team still holds decide who wins. One deposit of CELO funds **hundreds of tile claims** — and **every claim is a real on-chain transaction**.

## Problem
Most "onchain games" on mobile wallets are either heavy DeFi dashboards or one-tap click-to-earn loops. They are slow to grasp, give casual players no reason to come back, and rarely produce *sustained, honest* onchain activity. MiniPay reaches **14M+ self-custodial users** who hold stablecoins and CELO, but there is a shortage of **simple, social, mobile-native games** that:
- onboard a user into a real onchain action in seconds,
- give a genuine reason to return several times a day, and
- generate **real transactions from real distinct players** — not bot farming.

## Solution
Luxeni turns a single deposit into many rounds of play through an **energy** system, and makes activity **inherently multiplayer** through team-vs-team territory control:

1. **Join a team** (1 of 4) for the current battlefield.
2. **Claim tiles** that are *adjacent* to your team's territory — each claim spends **energy** and is **one on-chain transaction**.
3. **Energy regenerates for free** (slowly), or you can **buy more with CELO** when a war heats up.
4. **Hold your ground** — at match end, the tiles your team still controls decide the winner; the tiles *you personally* hold feed your **season rank**.

Because claiming is cheap and energy is shared per-user, genuine players make **many real transactions**, and because a battlefield is only fun when **many different people** fight on it, **DAU grows honestly** — not by one wallet replaying itself.

---

## How a match works
A **battlefield** is a single match instance.

| Property | Value (MVP default) |
|---|---|
| Teams | **4** (each a colour/faction) |
| Board | ~**80×80** tiles (gas paid only for *claimed* tiles) |
| Capacity | ~**100** players (4 × ~25) |
| Duration | **3 hours** (Hybrid tempo) |
| Concurrent battlefields per user | **3** |
| Re-queue cooldown | **10 minutes** |
| Expansion rule | tiles must be **contiguous** (adjacent) to your team |
| Win condition | team controlling the **most zones / tiles** at match end |

Lifecycle: `OPEN → ACTIVE → SETTLED` (or `CANCELLED` if it never fills).

A player may be in **up to 3 battlefields at once** and play **unlimited matches over time**. Energy is shared across them (see below), so multiple fronts is a **strategic trade-off**, not a free multiplier.

## The energy economy (LUX)
**LUX** is Luxeni's internal **energy credit** — *non-transferable*, refundable, and used only to claim tiles. It is **not** a speculative or tradeable token.

| Rule | Value (MVP default) |
|---|---|
| Free regen | **1 LUX / 20 min**, stored up to **10** |
| Buy with CELO | **1 CELO = 1,000 LUX** (fixed rate, no oracle in MVP) |
| Claim **empty** tile | **1 LUX** |
| Claim **enemy** tile (attack) | **3 LUX** |
| Anti-whale (per user, rolling 5h) | first **20** claims at base cost; each further claim **+1 LUX** cumulatively |
| Withdraw | unused LUX → CELO at **1:1** rate (refundable → not gambling) |

> **Why it stays clean:** you pay to *create / expand*, never to *wager*. There is no randomness and no monetary payout to winners in the base game. Unused LUX is always withdrawable. LUX = arcade tokens for building, not chips for betting. See [Compliance disclaimer](#compliance-disclaimer).

## Seasons, ranks & keepsakes
- **Season** = a meta-period of **4 weeks** that aggregates your battlefield results into a **global rank**.
- **Rank metric** = tiles you **still control at the end of each match** (rewards skill & defense, not spam).
- **Leaderboard views:** Top **100** global + **your own position** highlighted, the **4 team standings**, and the live **battlefield** board. Past seasons are **archived and viewable forever** (on-chain truth + indexer).
- **Keepsake NFT** 🗺️ — minted at **season end**, displayed in your **profile**. The art is a generative snapshot of the final battlefield + your rank badge. The NFT's art is **upgradeable** (mutable `tokenURI` via an upgradeable render contract) so it can be finalised after launch, then **frozen** per-season.

---

## Why Luxeni fits builder-reward programs
Luxeni targets **Talent-tracked builder-reward programs** on multiple chains.

| Program signal | How Luxeni responds |
|---|---|
| Category: **Games** | A casual-competitive territory game — not a DeFi/finance app |
| **Onchain activity** | **Each tile claim = one transaction.** A funded session is dozens–hundreds of claims |
| **Real distinct users (DAU)** | Battlefields are only fun when many different people play; team war drives viral acquisition |
| **Mobile-first MiniApp** | Built for the MiniPay in-wallet browser; Farcaster MiniApp planned |
| **Open source, verified contracts** | Public repo, MIT; contracts verified on Celoscan / deployed via Clarinet |
| **"Simpler is better"** | One action (claim a tile), one internal credit (LUX), one loop |

### Effect on the tracked metrics — honestly
| Metric | Effect | Why |
|---|---|---|
| **Transactions** | ↑ | Each `claimTile()` is one tx. Cheap per-claim cost → real players claim many |
| **Gas Fees** | ↑ (proportional) | Every claim pays gas — never zero |
| **DAU** | ↑ (organically) | A battlefield needs many *distinct* wallets to be fun; team war pulls new players in |

> **Integrity note — this is not transaction farming.** The energy model does not *invent* transactions; it makes each claim cheap so *genuine* users claim many. Inflating metrics by scripting wallets on mainnet is exactly the **bot-engagement / reward-farming** pattern these programs reject. The defensible signal is **real players × many claims each** — which lifts Transactions *and* DAU together. Bots are used **only for load-testing on testnet (Alfajores)**, never as submission activity. See [Integrity & anti-abuse](#integrity--anti-abuse).

## Multi-chain architecture
Luxeni follows a **monorepo, two-implementations** pattern (same game, per-chain contracts, shared frontend):

```text
luxeni/
├── frontend/          # 🗺️ Next.js / React MiniApp (MiniPay + Farcaster), shared UI
├── celo-contracts/    # 🗺️ Hardhat/Foundry — Solidity (EVM), primary target
├── stacks-contracts/  # 🗺️ Clarinet — Clarity, parallel target (Stacks Builder Rewards)
├── sdk/               # 🗺️ TypeScript SDK — chain-agnostic helpers, ABI/contract bindings
└── docs/              # PRD, architecture, events
```

- **Celo (current build):** Solidity on Celo Mainnet, MiniApp in MiniPay, CELO native deposits. **This is the focus until it is on-chain and submitted.**
- **Stacks (next):** the same game logic in **Clarity** for **Stacks Builder Rewards** — **started only after the Celo build is live and submitted.** STX replaces CELO as the deposit asset; the frontend swaps wallet + tx layer.
- **Shared:** game rules, board/render logic, leaderboard indexer, and most of the UI are chain-agnostic and live once.

> The architecture is designed for two smart-contract implementations (Solidity + Clarity, like the chessxu reference), but execution is **sequential: Celo first, Stacks after.**

## Smart-contract design
Core contracts (Celo / Solidity; Clarity mirrors the same state machine):

- **`Luxeni` (UUPS upgradeable)** — energy economy + tile claims
  - `buyLux()` payable, `withdrawLux(amount)`, `claimTile(battlefieldId, x, y)`, `joinTeam(...)`
  - storage: `lux[user]`, per-battlefield `tile[index]`, `nextRegen[user]`, `windowClaims[user]`
  - all updates **O(1)**; canvas reconstructed from `TileClaimed` **events**, not stored history
- **`BattlefieldFactory` (upgradeable)** — creates battlefields dynamically (on matchmaking demand) and **event/sponsored battlefields** on request
- **`SeasonRegistry`** — per-season scores (tiles held), archived by `seasonId`
- **`LuxeniKeepsake` (NFT, upgradeable render)** 🗺️ — mints season keepsakes; `setTokenURI` / upgradeable renderer until art is finalised, then `freeze()`

**Safety rules enforced:** CEI + ReentrancyGuard on all value-moving paths; no unbounded loops (zone control via incremental per-zone/per-team counters); bounds + cooldown + balance checks; upgrade controlled by **timelock + multisig**.

## Integrity & anti-abuse
- **3-concurrent cap + 10-min re-queue cooldown** — bounds parallel play.
- **Energy is per-user** — multiple battlefields share one energy pool; more fronts ≠ more free energy.
- **Anti-whale is per-user** — escalation persists across all battlefields; a whale can't reset price by switching matches.
- **Bots for testnet load-testing only** — generate wallets + simulated claims on **Alfajores** to validate scale; **never** submitted as mainnet metrics.
- **Proof-of-personhood (Self)** 🗺️ — deferred to a later phase; **required** for any future money-prize sponsored events so payouts go to unique, verified humans.

## Tech stack
| Layer | Technology |
|---|---|
| Contracts (Celo) | Solidity · Hardhat/Foundry · OpenZeppelin (UUPS, ReentrancyGuard) |
| Contracts (Stacks) | Clarity · Clarinet |
| Frontend | Next.js / React · TypeScript · Tailwind · viem/wagmi · `@stacks/connect` |
| Wallets | MiniPay (Celo) · Stacks wallet · Farcaster MiniApp |
| Indexer | lightweight event indexer for leaderboard (reads on-chain truth) |
| Storage | IPFS (NFT art) |

## Repository structure
See [Multi-chain architecture](#multi-chain-architecture). Product spec lives in [`PRD.md`](./PRD.md).

## Roadmap
- **Phase 1 (MVP, Celo):** energy economy (LUX), battlefields, 4-team territory war, matchmaking, season ranks, leaderboard, verified contracts on Celo Mainnet. 🗺️
- **Phase 2 (Stacks — only after Phase 1 is live & submitted):** **Clarity** build in `stacks-contracts/`, Stacks wallet integration, deploy for **Stacks Builder Rewards** (STX deposits). 🗺️
- **Phase 3:** Keepsake NFT (finalised art), Farcaster MiniApp, archived-season views, Pyth oracle option. 🗺️
- **Phase 4:** **Sponsored money-prize events** (skill-contest, sponsor-funded, Self/KYC-gated); brand collaborations. 🗺️

## Compliance disclaimer
Luxeni's base game is a **skill-based game**, not gambling: you pay energy to *build and expand*, outcomes are skill-driven (not chance), unused LUX is refundable, and there is **no monetary payout to winners**. Any future **sponsored event with a monetary grand prize** will be structured as a **skill contest** with the prize **funded by the sponsor** (not from player deposits), winners determined by skill, and prize-eligibility **gated by identity verification**. Such events are **jurisdiction-dependent**; this is **not legal advice**, and restricted regions will be excluded.

## License
MIT

# Luxeni — Leaderboard Indexer

Lightweight service that reads **on-chain events** from the live Luxeni contract and serves a
**sorted leaderboard** + battlefield board state. On-chain is the source of truth; the indexer
only reads + sorts (cannot fake data).

## Why
Sorting thousands of players on-chain is a gas bomb, so ranking is computed off-chain from events.

## Events consumed (ABIs in ../sdk)
- `TileClaimed(bf, user, x, y, team, prevTeam)` — board state + per-user tiles
- `BattlefieldCreated` / `BattlefieldSettled` — match lifecycle + winner
- `MatchScoreClaimed(bf, user, season, points)` — season scores → leaderboard
- `SeasonRolled` — season boundaries (archive)

## Endpoints (target)
- `GET /leaderboard?season=` — Top 100 + a given wallet's rank
- `GET /battlefield/:bf` — current board (reconstructed from TileClaimed)
- `GET /teams/:bf` — 4 team standings

## TASKS
- [ ] Event backfill + live subscription (viem) using @luxeni/sdk addresses/ABIs
- [ ] Aggregate seasonScore per (season, user); sort; expose Top 100 + self-rank
- [ ] Board reconstruction cache per battlefield
- [ ] Archive past seasons (by seasonId)
- [ ] Serve to frontend

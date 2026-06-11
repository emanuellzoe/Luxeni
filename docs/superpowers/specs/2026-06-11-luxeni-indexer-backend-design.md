# Luxeni — Leaderboard & Board Indexer (Backend) — Design

> **Status:** Approved design · **Date:** 2026-06-11 · **Owner:** @emanuellzoe
> **Scope:** Option A (core indexer) · **Stack:** Node + Drizzle + Neon Postgres + Next.js API routes + GitHub Actions cron

---

## 1. Goal

Give Luxeni the two read surfaces a browser cannot build for itself:

1. **A sorted leaderboard** — Top 100 per season + the connected wallet's own rank + the four team standings. Sorting players on-chain is a gas bomb, and `seasonScore` is a non-iterable mapping, so ranking must be computed off-chain from events.
2. **A full-board view** — the complete 80×80 battlefield. The frontend reads one RPC call per tile, so today it can only render a 10×10 window (a full board would be 6,400 reads). Reconstructed from `TileClaimed` events instead.

The backend is a **read-only indexer**: it reads on-chain events, aggregates them in Postgres, and serves small JSON to the frontend. It is **never** in the write path — every gameplay transaction still goes wallet → contract directly. The indexer cannot fabricate data; every value is derived from chain events and is independently verifiable.

## 2. Scope

**In scope (Option A):**
- Event backfill (from contract deploy block) + incremental catch-up (cron poll).
- Aggregation into Neon Postgres.
- Leaderboard API (Top 100 + self-rank + team standings, per season, archived seasons).
- Battlefield board-reconstruction API.
- Frontend integration: a Leaderboard panel + team standings + full-board overview.

**Out of scope (deferred — Options B/C):**
- Realtime push (SSE/WebSocket). The frontend keeps polling / reading its live 10×10 window directly from chain.
- Lobby/matchmaking battlefield-list API beyond what the existing UI uses.
- Metrics dashboard (DAU / tx / gas).
- Keepsake NFT render service + IPFS pinning.
- Testnet bot load-test harness.

**Non-negotiable invariants:**
- **Read-only.** The backend holds no private keys and sends no transactions.
- **Derived-from-chain.** Every served value is reproducible from on-chain events.
- **Idempotent ingestion.** Re-processing any block range produces the same DB state (required because the cron is at-least-once and overlaps recent blocks for reorg safety).
- **On-chain is the source of truth.** The DB is a disposable cache; it can be rebuilt by replaying events.

## 3. Architecture (free hosting — "Route 3")

```text
                 ┌─────────────────────────────┐
GitHub Actions   │  ingestor (Node, one-shot)  │
 cron ~5 min ───►│  getLogs since cursor        │── upsert ──┐
                 │  decode (@luxeni/sdk)        │            ▼
                 │  idempotent writes           │      ┌───────────────┐
                 └─────────────────────────────┘      │ Neon Postgres │
                                                       └───────────────┘
                                                              ▲
   Frontend ── fetch /api/* ──► Next.js route handlers ───────┘
   (Vercel)                     (Node runtime, Drizzle + Neon serverless driver)
```

- **Ingestor:** a Node script (in `indexer/`) triggered by a GitHub Actions cron every ~5 minutes. It runs in **one-shot mode**: read cursor → sweep new logs in chunks until caught up → write cursor → exit. No always-on process, so it fits free tiers with nothing to keep warm.
- **Database:** Neon Postgres (already provisioned). Accessed via Drizzle ORM + `@neondatabase/serverless`.
- **API:** Next.js route handlers under `frontend/app/api/*`, deployed with the existing frontend on Vercel. They read Neon and return JSON. No separate backend deploy.
- **Shared SDK:** `@luxeni/sdk` provides addresses, RPC URLs, the ABI, `LUXENI_EVENTS`, and `parseLuxeniLogs`. Used by both the ingestor and (for types) the API.

**Why a backend at all (vs. pure client):** the heavy work — scanning the full event history and sorting all players — must happen once and be cached, not repeated in every visitor's browser (which would be slow and would exhaust the public RPC's `getLogs` limits). `viem` is just the library; here it runs server-side in the ingestor.

**Freshness:** the cron's ~5-minute latency is acceptable. The leaderboard only changes when a match settles and a player claims their score (matches are 3 hours). The latency-sensitive live tile interactions keep reading the on-chain 10×10 window directly; only the *full-board overview* is served (slightly stale) by the indexer.

## 4. Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node (TypeScript) |
| ORM / DB driver | Drizzle ORM + `@neondatabase/serverless` |
| Migrations | `drizzle-kit` |
| Chain reads | `viem` (`getLogs`, `parseEventLogs`) via `@luxeni/sdk` |
| Database | Neon Postgres (serverless) |
| Ingestion trigger | GitHub Actions cron (~5 min) |
| API | Next.js route handlers (`app/api/*`) on Vercel |
| Tests | Vitest (indexer unit tests over fixture logs) |

## 5. Data model

All tables live in Neon. Ingestion only ever does **idempotent upserts / deletes** — there are **no read-modify-write counters**. All standings and rankings are **derived at query time** by SQL aggregation over base tables, so re-processing a block range can never double-count.

```text
sync_state(chain_id PK, last_block)
  -- ingestion cursor; one row per chain (42220).

tiles(bf, x, y, team, owner, block, log_index)         PK (bf, x, y)
  -- current board. Source: TileClaimed. Last-write-wins by (block, log_index).

battlefields(bf PK, status, end_time, winning_team, season_id)
  -- match lifecycle. Sources: BattlefieldCreated (insert), BattlefieldSettled (update).

bf_players(bf, user, team)                              PK (bf, user)
  -- membership. Sources: TeamJoined (insert/update team), BattlefieldLeft (delete).
  -- player counts are COUNT(*) over this table — idempotent.

match_scores(bf, user, season, points)                 PK (bf, user)
  -- per-match scored tiles. Source: MatchScoreClaimed (one per bf/user on-chain).
  -- leaderboard = SUM(points) GROUP BY (season, user).

seasons(season_id PK, end_time)
  -- season archive. Source: SeasonRolled. Season 1 seeded from contract (see §6.4).
```

**Conventions:**
- Addresses stored **lowercased** (so `?me=` lookups compare cleanly).
- `bf`, `season`, counts, `points` fit comfortably in `int8`; Drizzle `bigint({ mode: "number" })` is fine (all well under 2^53). Timestamps (`end_time`) stored as epoch seconds in `bigint`.
- `team`: smallint, `0` = empty, `1..4` = factions.

## 6. Ingestion design

### 6.1 Cursor & sweep
- Read `last_block` from `sync_state` (seeded to `DEPLOY_BLOCK` on first run).
- `head = getBlockNumber() − FINALITY_BUFFER`.
- Sweep `[last_block + 1 − OVERLAP, head]` in chunks of `CHUNK` blocks (e.g. 10k — the public RPC caps `getLogs` ranges).
- For each chunk: `getLogs({ address: Luxeni, fromBlock, toBlock })` → `parseLuxeniLogs` → dispatch handlers in `(block, log_index)` order.
- After the full sweep, set `last_block = head`.

### 6.2 Reorg safety
- `FINALITY_BUFFER` (small, e.g. 5–15 blocks) keeps the cursor behind the unstable head.
- Each run re-scans an `OVERLAP` (e.g. 50 blocks) below the cursor. Because every handler is idempotent, re-applying recent events is a no-op.

### 6.3 Event → write mapping

| Event | Write |
|---|---|
| `TileClaimed(bf,user,x,y,team,prevTeam)` | upsert `tiles(bf,x,y)` = `{team, owner=user, block, log_index}` **only if** incoming `(block,log_index) ≥` stored |
| `BattlefieldCreated(bf,endTime,seasonId)` | insert `battlefields(bf, status=1, end_time, winning_team=0, season_id)` ON CONFLICT DO NOTHING |
| `BattlefieldSettled(bf,winningTeam)` | update `battlefields` SET `status=2, winning_team` WHERE `bf` |
| `TeamJoined(bf,user,team)` | insert `bf_players(bf,user,team)` ON CONFLICT (bf,user) DO UPDATE SET `team` |
| `BattlefieldLeft(bf,user)` | delete `bf_players` WHERE `bf,user` |
| `MatchScoreClaimed(bf,user,season,points)` | insert `match_scores(bf,user,season,points)` ON CONFLICT (bf,user) DO UPDATE |
| `SeasonRolled(newSeason,endTime)` | insert `seasons(season_id,end_time)` ON CONFLICT DO UPDATE SET `end_time` |

> Note: `BattlefieldLeft` is not in the SDK's `TRACKED_EVENTS` list today; PR5 adds it (the ingestor decodes the full ABI regardless, so this is a list/typing update for completeness).

### 6.4 Season 1 edge case
The contract constructor sets `currentSeason = 1` and `seasonEnd` **without emitting `SeasonRolled`** (that event only fires on rollover to season ≥ 2). So season 1 never appears from events. At init/backfill the ingestor reads `seasonEnd()` from the contract and seeds `seasons(1, seasonEnd)`.

### 6.5 Backfill
- `DEPLOY_BLOCK` = the block of the `Luxeni` contract creation tx (resolved from Celoscan during PR6; stored as an env var / SDK constant).
- First run starts the cursor there and catches up chunk-by-chunk. A GitHub Actions job has a 6h ceiling — ample for the initial sweep. Subsequent cron runs are tiny deltas.

### 6.6 Run mode
- One-shot: catch up to `head`, then exit `0`. This is what the cron invokes.
- `--from <block>` flag for manual re-backfill / recovery.

## 7. API

All under `frontend/app/api/`. Responses set `Cache-Control: s-maxage=30, stale-while-revalidate=60` (data moves on a ~5 min cadence; brief CDN caching smooths load). Addresses in query params are lowercased before lookup.

### `GET /api/leaderboard?season=<n>&me=<addr>`
- `season` defaults to the latest known season.
- **Top 100:** `SELECT user, SUM(points) AS score, RANK() OVER (ORDER BY SUM(points) DESC) AS rank FROM match_scores WHERE season = $1 GROUP BY user ORDER BY score DESC LIMIT 100`.
- **Self-rank** (when `me` given): a CTE ranks every player; select the row where `user = me`. Returns `null` if the wallet has no score.
- Response: `{ season, top: [{ rank, user, score }], me: { rank, score } | null }`.

### `GET /api/battlefield/[bf]`
- `SELECT x, y, team, owner FROM tiles WHERE bf = $1` (sparse — only claimed tiles) + the `battlefields` meta row.
- The frontend renders the full 80×80 from the sparse set (unclaimed = empty).
- Response: `{ bf, status, endTime, winningTeam, seasonId, tiles: [{ x, y, team, owner }] }`.

### `GET /api/teams/[bf]`
- Tile standings: `SELECT team, COUNT(*) FROM tiles WHERE bf=$1 GROUP BY team`.
- Player standings: `SELECT team, COUNT(*) FROM bf_players WHERE bf=$1 GROUP BY team`.
- Response: `{ bf, teams: [{ team, tiles, players }] }` for teams 1..4.

### `GET /api/seasons`
- `SELECT season_id, end_time FROM seasons ORDER BY season_id DESC`.
- Response: `{ seasons: [{ seasonId, endTime }] }`.

## 8. Frontend integration
- A typed API client (`frontend/lib/indexer.ts`) wrapping the four endpoints.
- A **Leaderboard panel** in the War Room: Top 100 with the connected wallet highlighted + the wallet's own rank when outside the top 100.
- **Team standings** sourced from `/api/teams/[bf]` for the active battlefield.
- A **full-board overview** (80×80) from `/api/battlefield/[bf]`, alongside the existing interactive 10×10 live window (which still reads chain directly).

## 9. Repository layout

```text
indexer/
├── package.json, tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── db/            # Drizzle schema + client (shared shape with API)
│   ├── chain.ts       # viem client from @luxeni/sdk
│   ├── sweep.ts       # cursor + chunked getLogs
│   ├── handlers/      # one module per event
│   ├── backfill.ts
│   └── index.ts       # one-shot entry
├── migrations/        # drizzle-kit output
└── README.md          # env + run instructions
.github/workflows/indexer.yml   # cron
frontend/
├── app/api/leaderboard/route.ts
├── app/api/battlefield/[bf]/route.ts
├── app/api/teams/[bf]/route.ts
├── app/api/seasons/route.ts
└── lib/indexer.ts                 # typed client
```

The Drizzle schema is defined once (in `indexer/src/db`) and imported by the Next.js routes so both sides share table definitions and types.

## 10. Environment & secrets

| Var | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | ingestor (GH Actions) + API (Vercel) | Neon connection string (pooled). Local dev: `indexer/.env` (gitignored). **Never** pasted into chat or committed. |
| `CELO_RPC_URL` | ingestor | Defaults to `https://forno.celo.org` (in SDK). Overridable if rate-limited. |
| `DEPLOY_BLOCK` | ingestor | Contract creation block (resolved in PR6). |

- GitHub: set `DATABASE_URL`, `CELO_RPC_URL` as repo secrets. Repo ideally **public** (free unlimited Actions; private = 2,000 min/mo, still enough for a 5-min cron).
- Vercel: set `DATABASE_URL` (and `CELO_RPC_URL` if any route reads chain) in project env.

## 11. Testing
- **Unit (Vitest, in `indexer/`):** dispatcher routing; each handler's write given fixture decoded logs; **idempotency** — applying the same batch twice yields identical DB state; `tiles` last-write-wins ordering.
- **Manual:** run a bounded backfill against Neon, hit each `/api/*` route, eyeball leaderboard ordering + self-rank.

## 12. Risks & mitigations
- **Public RPC `getLogs` limits / rate-limiting (forno):** chunk block ranges; keep cron cadence modest; `CELO_RPC_URL` overridable for a dedicated provider if needed.
- **GitHub Actions cron drift:** scheduled runs are best-effort and can lag a few minutes — acceptable for this data. (Scheduled workflows are also auto-disabled after 60 days of repo inactivity; a commit re-enables.)
- **Reorgs:** finality buffer + idempotent overlap re-scan.
- **Vercel/Neon cold starts:** the Neon serverless driver keeps API cold-starts in the low-hundreds-of-ms range; brief CDN caching absorbs bursts.

## 13. Delivery plan — 30 commits / 10 PRs

Dependency-ordered; each PR merges independently on top of the previous. Conventional commits; no padding (CONTRIBUTING.md).

**PR1 — DB foundation**
1. `chore(db): add drizzle-orm, @neondatabase/serverless, drizzle-kit + drizzle.config.ts`
2. `feat(db): Drizzle schema (sync_state, tiles, battlefields, bf_players, match_scores, seasons)`
3. `feat(db): initial migration, db client, and Neon setup README`

**PR2 — Indexer skeleton**
4. `feat(indexer): scaffold package (package.json, tsconfig, entrypoint)`
5. `feat(indexer): viem public client from @luxeni/sdk addresses + rpc`
6. `feat(indexer): sync_state cursor + chunked getLogs sweep (log count only)`

**PR3 — Decode & dispatch**
7. `feat(indexer): decode logs via @luxeni/sdk parseLuxeniLogs`
8. `feat(indexer): event dispatcher keyed by event name`
9. `test(indexer): dispatcher unit tests over sample logs`

**PR4 — Board ingestion**
10. `feat(indexer): TileClaimed → tiles upsert (last-write-wins by block,logIndex)`
11. `feat(indexer): BattlefieldCreated → battlefields insert`
12. `feat(indexer): BattlefieldSettled → status + winner update`

**PR5 — Scores, seasons, teams**
13. `feat(indexer): MatchScoreClaimed → match_scores upsert`
14. `feat(indexer): SeasonRolled → seasons upsert + seed season 1 from contract`
15. `feat(indexer): TeamJoined/BattlefieldLeft → bf_players membership`

**PR6 — Backfill & robustness**
16. `feat(indexer): backfill from contract deploy block`
17. `fix(indexer): finality buffer + reorg overlap re-scan`
18. `test(indexer): idempotency — re-applying events is a no-op`

**PR7 — Cron / CI**
19. `feat(indexer): one-shot catch-up run mode for cron`
20. `ci: GitHub Actions cron workflow (every 5 min)`
21. `docs(indexer): env, secrets, and run instructions`

**PR8 — API: leaderboard**
22. `feat(api): Neon serverless Drizzle client for Next.js`
23. `feat(api): GET /api/leaderboard — Top 100 by season (SUM points)`
24. `feat(api): self-rank via RANK() OVER for ?me=`

**PR9 — API: board / teams / seasons**
25. `feat(api): GET /api/battlefield/[bf] — sparse claimed tiles + meta`
26. `feat(api): GET /api/teams/[bf] — tile + player standings per team`
27. `feat(api): GET /api/seasons — archive list + cache headers`

**PR10 — Frontend integration**
28. `feat(frontend): typed indexer API client + types`
29. `feat(frontend): Leaderboard panel (Top 100 + your rank) in War Room`
30. `feat(frontend): team standings + full-board overview from API`

## 14. Definition of done
- All 6 events ingested idempotently into Neon; cursor advances; backfill from deploy block completes.
- GitHub Actions cron runs the catch-up on schedule.
- Four API routes return correct, season-aware JSON; leaderboard ordering + self-rank verified.
- War Room shows a live leaderboard, team standings, and a full-board overview.
- Indexer unit tests green; no secrets committed.

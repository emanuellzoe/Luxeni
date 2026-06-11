# Luxeni Indexer Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only event indexer that serves Luxeni's leaderboard, team standings, and full-board state to the frontend, derived entirely from on-chain events.

**Architecture:** A self-contained Node ingestor (`indexer/`) sweeps `Luxeni` contract logs via viem, writing idempotently to Neon Postgres with Drizzle. A GitHub Actions cron runs it every ~5 min (one-shot catch-up). Next.js route handlers (`frontend/app/api/*`) read Neon with `@neondatabase/serverless` raw SQL and serve JSON. Nothing is in the write path; the DB is a disposable cache rebuildable from chain.

**Tech Stack:** Node 20 · TypeScript · Drizzle ORM + `drizzle-kit` · `@neondatabase/serverless` · viem 2 · Vitest + `@electric-sql/pglite` · Next.js 14 (app router) · GitHub Actions.

**Design source:** `docs/superpowers/specs/2026-06-11-luxeni-indexer-backend-design.md` (read it for rationale; this plan is execution-only).

---

## Conventions for every task

- **Branch per PR:** `git checkout main && git pull && git checkout -b <branch>` at PR start. Open the PR after its last commit.
- **Commit messages:** exactly as quoted (Conventional Commits).
- **Run indexer commands from `indexer/`**, frontend commands from `frontend/`.
- **Never commit secrets.** `.env` is already gitignored.
- After each commit step: `git add <listed files> && git commit -m "<message>"`.

---

## File structure (locked)

```text
indexer/
├── package.json              # deps, scripts (start, test, db:generate, db:migrate)
├── tsconfig.json
├── drizzle.config.ts         # drizzle-kit config → Neon
├── vitest.config.ts
├── .env.example              # DATABASE_URL, CELO_RPC_URL, DEPLOY_BLOCK
├── abi/Luxeni.json           # copied from sdk/src/abi/Luxeni.json
├── migrations/               # drizzle-kit generate output (SQL)
├── src/
│   ├── env.ts                # validated env access
│   ├── chain.ts              # viem client + LUXENI address + abi
│   ├── db/
│   │   ├── schema.ts         # 6 Drizzle tables
│   │   └── client.ts         # makeDb(url) → Drizzle (neon-serverless Pool)
│   ├── decode.ts             # parseEventLogs(abi, logs)
│   ├── sweep.ts              # cursor get/set + chunked getLogs generator
│   ├── handlers/
│   │   ├── index.ts          # applyEvents(db, events) dispatcher
│   │   ├── tiles.ts          # onTileClaimed
│   │   ├── battlefields.ts   # onBfCreated, onBfSettled
│   │   ├── players.ts        # onTeamJoined, onBfLeft
│   │   └── seasons.ts        # onSeasonRolled, onMatchScoreClaimed, seedSeason1
│   ├── deployBlock.ts        # resolveDeployBlock() (env or binary search)
│   └── index.ts              # one-shot entry: backfill + catch-up
└── test/
    ├── helpers.ts            # pglite test db factory
    ├── dispatch.test.ts
    ├── handlers.test.ts
    └── idempotency.test.ts
.github/workflows/indexer.yml
frontend/
├── lib/db.ts                 # neon() sql client
├── lib/indexer.ts            # typed API client + types
├── app/api/leaderboard/route.ts
├── app/api/battlefield/[bf]/route.ts
├── app/api/teams/[bf]/route.ts
├── app/api/seasons/route.ts
└── app/app/_components/Leaderboard.tsx   # War Room panel
```

---

# PR1 — DB foundation

**Branch:** `feat/indexer-db-foundation`

### Task 1 — deps + drizzle config + entry scaffold

**Files:** Create `indexer/package.json`, `indexer/tsconfig.json`, `indexer/drizzle.config.ts`, `indexer/.env.example`, `indexer/src/env.ts`.

- [ ] **Step 1: `indexer/package.json`**

```json
{
  "name": "luxeni-indexer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.0",
    "dotenv": "^16.4.5",
    "drizzle-orm": "^0.36.0",
    "viem": "^2.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@electric-sql/pglite": "^0.2.12",
    "@types/node": "^22.7.0",
    "@types/ws": "^8.5.12",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: `indexer/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src", "test", "drizzle.config.ts"]
}
```

- [ ] **Step 3: `indexer/drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: `indexer/.env.example`**

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST/db?sslmode=require
CELO_RPC_URL=https://forno.celo.org
# Optional. If unset, the indexer binary-searches the contract deploy block once.
DEPLOY_BLOCK=
```

- [ ] **Step 5: `indexer/src/env.ts`**

```ts
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  rpcUrl: process.env.CELO_RPC_URL ?? "https://forno.celo.org",
  deployBlock: process.env.DEPLOY_BLOCK ? Number(process.env.DEPLOY_BLOCK) : undefined,
};
```

- [ ] **Step 6: install + commit**

Run: `cd indexer && npm install` → Expected: lockfile created, no errors.

```bash
git add indexer/package.json indexer/package-lock.json indexer/tsconfig.json indexer/drizzle.config.ts indexer/.env.example indexer/src/env.ts
git commit -m "chore(db): add drizzle-orm, @neondatabase/serverless, drizzle-kit + drizzle.config.ts"
```

### Task 2 — Drizzle schema

**Files:** Create `indexer/src/db/schema.ts`, `indexer/src/db/client.ts`.

- [ ] **Step 1: `indexer/src/db/schema.ts`**

```ts
import { pgTable, bigint, integer, smallint, text, primaryKey } from "drizzle-orm/pg-core";

export const syncState = pgTable("sync_state", {
  chainId: integer("chain_id").primaryKey(),
  lastBlock: bigint("last_block", { mode: "number" }).notNull(),
});

export const tiles = pgTable("tiles", {
  bf: bigint("bf", { mode: "number" }).notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  team: smallint("team").notNull(),
  owner: text("owner").notNull(),
  block: bigint("block", { mode: "number" }).notNull(),
  logIndex: integer("log_index").notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.bf, t.x, t.y] }) }));

export const battlefields = pgTable("battlefields", {
  bf: bigint("bf", { mode: "number" }).primaryKey(),
  status: smallint("status").notNull(),
  endTime: bigint("end_time", { mode: "number" }).notNull(),
  winningTeam: smallint("winning_team").notNull().default(0),
  seasonId: integer("season_id").notNull(),
});

export const bfPlayers = pgTable("bf_players", {
  bf: bigint("bf", { mode: "number" }).notNull(),
  user: text("user").notNull(),
  team: smallint("team").notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.bf, t.user] }) }));

export const matchScores = pgTable("match_scores", {
  bf: bigint("bf", { mode: "number" }).notNull(),
  user: text("user").notNull(),
  season: integer("season").notNull(),
  points: bigint("points", { mode: "number" }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.bf, t.user] }) }));

export const seasons = pgTable("seasons", {
  seasonId: integer("season_id").primaryKey(),
  endTime: bigint("end_time", { mode: "number" }).notNull(),
});
```

- [ ] **Step 2: `indexer/src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

export function makeDb(url: string) {
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
export type Db = ReturnType<typeof makeDb>;
```

- [ ] **Step 3: typecheck + commit**

Run: `cd indexer && npx tsc --noEmit` → Expected: no errors.

```bash
git add indexer/src/db/schema.ts indexer/src/db/client.ts
git commit -m "feat(db): Drizzle schema (sync_state, tiles, battlefields, bf_players, match_scores, seasons)"
```

### Task 3 — initial migration + README

**Files:** Create `indexer/migrations/*` (generated), `indexer/README.md` (replace stub).

- [ ] **Step 1: generate the migration**

Run: `cd indexer && npm run db:generate`
Expected: a `migrations/0000_*.sql` + `migrations/meta/` created with `CREATE TABLE` for all 6 tables.

- [ ] **Step 2: replace `indexer/README.md`**

````markdown
# Luxeni — Leaderboard Indexer

Read-only Node ingestor: sweeps `Luxeni` contract events → Neon Postgres → served by
`frontend/app/api/*`. On-chain is the source of truth; the DB is a rebuildable cache.

## Setup
```bash
cd indexer
npm install
cp .env.example .env        # fill DATABASE_URL (Neon), optionally CELO_RPC_URL
npm run db:migrate          # apply schema to Neon
npm start                   # one-shot: backfill + catch-up, then exit
npm test                    # vitest (pglite, no network)
```

## How it works
- Cursor in `sync_state`; each run sweeps `[cursor-OVERLAP, head-FINALITY]` in chunks.
- All writes idempotent (upsert/delete); standings/ranks derived via SQL.
- Triggered every ~5 min by `.github/workflows/indexer.yml`.

See `docs/superpowers/specs/2026-06-11-luxeni-indexer-backend-design.md`.
````

- [ ] **Step 3: commit**

```bash
git add indexer/migrations indexer/README.md
git commit -m "feat(db): initial migration, db client, and Neon setup README"
```

- [ ] **Step 4: open PR1**

```bash
git push -u origin feat/indexer-db-foundation
gh pr create --title "feat(db): indexer DB foundation (Drizzle + Neon schema)" --body "Drizzle schema for the 6 indexer tables, Neon client, initial migration. Part of the indexer backend (spec: docs/superpowers/specs/2026-06-11-luxeni-indexer-backend-design.md)."
```

---

# PR2 — Indexer skeleton

**Branch:** `feat/indexer-skeleton` (from updated `main` after PR1 merges, or stack on PR1 — note in PR body if stacked).

### Task 4 — viem chain client + ABI

**Files:** Create `indexer/abi/Luxeni.json` (copy), `indexer/src/chain.ts`.

- [ ] **Step 1: copy the ABI**

Run (PowerShell): `Copy-Item ..\sdk\src\abi\Luxeni.json indexer\abi\Luxeni.json` (from repo root; create `indexer/abi/` first if needed).
Expected: `indexer/abi/Luxeni.json` exists and is valid JSON.

- [ ] **Step 2: `indexer/src/chain.ts`**

```ts
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { env } from "./env";
import LuxeniAbi from "../abi/Luxeni.json" assert { type: "json" };

export const CELO_MAINNET = 42220;
export const LUXENI = "0x82064c90A86BA16d81Dd1fb16374D78A70d59e70" as const;
export const abi = LuxeniAbi as unknown as readonly unknown[];

export const client = createPublicClient({ chain: celo, transport: http(env.rpcUrl) });
```

- [ ] **Step 3: typecheck + commit**

Run: `cd indexer && npx tsc --noEmit` → Expected: no errors.

```bash
git add indexer/abi/Luxeni.json indexer/src/chain.ts
git commit -m "feat(indexer): viem public client + Luxeni ABI from sdk"
```

### Task 5 — cursor read/write

**Files:** Create `indexer/src/sweep.ts` (cursor portion). **Test:** `indexer/test/helpers.ts`, `indexer/test/cursor.test.ts`.

- [ ] **Step 1: `indexer/test/helpers.ts`** (pglite db factory)

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/db/schema";

export async function testDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./migrations" });
  return db as unknown as import("../src/db/client").Db;
}
```

- [ ] **Step 2: write failing test `indexer/test/cursor.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getCursor, setCursor } from "../src/sweep";
import { testDb } from "./helpers";

describe("cursor", () => {
  it("returns fallback when unset, then persists", async () => {
    const db = await testDb();
    expect(await getCursor(db, 42220, 100)).toBe(100); // fallback
    await setCursor(db, 42220, 555);
    expect(await getCursor(db, 42220, 100)).toBe(555);
  });
});
```

- [ ] **Step 3: run → fail**

Run: `cd indexer && npx vitest run test/cursor.test.ts`
Expected: FAIL (`getCursor` not exported).

- [ ] **Step 4: `indexer/src/sweep.ts`** (cursor functions)

```ts
import { eq } from "drizzle-orm";
import type { Db } from "./db/client";
import { syncState } from "./db/schema";

export async function getCursor(db: Db, chainId: number, fallback: number): Promise<number> {
  const rows = await db.select().from(syncState).where(eq(syncState.chainId, chainId));
  return rows[0]?.lastBlock ?? fallback;
}

export async function setCursor(db: Db, chainId: number, block: number): Promise<void> {
  await db.insert(syncState).values({ chainId, lastBlock: block })
    .onConflictDoUpdate({ target: syncState.chainId, set: { lastBlock: block } });
}
```

- [ ] **Step 5: run → pass**

Run: `cd indexer && npx vitest run test/cursor.test.ts` → Expected: PASS.

- [ ] **Step 6: commit**

```bash
git add indexer/src/sweep.ts indexer/test/helpers.ts indexer/test/cursor.test.ts indexer/vitest.config.ts
git commit -m "feat(indexer): sync_state cursor read/write (pglite-tested)"
```

> Also create `indexer/vitest.config.ts`:
> ```ts
> import { defineConfig } from "vitest/config";
> export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
> ```

### Task 6 — chunked getLogs sweep

**Files:** Modify `indexer/src/sweep.ts` (add generator).

- [ ] **Step 1: append to `indexer/src/sweep.ts`**

```ts
import { LUXENI, abi, client as defaultClient } from "./chain";
import { parseEventLogs, type PublicClient } from "viem";

export const CHUNK = 10_000;
export const FINALITY = 10;
export const OVERLAP = 50;

export async function* sweepLogs(
  from: number, to: number, client: PublicClient = defaultClient as PublicClient, chunk = CHUNK,
) {
  for (let start = from; start <= to; start += chunk) {
    const end = Math.min(start + chunk - 1, to);
    const logs = await client.getLogs({
      address: LUXENI, fromBlock: BigInt(start), toBlock: BigInt(end),
    });
    yield { from: start, to: end, events: parseEventLogs({ abi, logs }) };
  }
}
```

- [ ] **Step 2: typecheck + commit**

Run: `cd indexer && npx tsc --noEmit` → Expected: no errors.

```bash
git add indexer/src/sweep.ts
git commit -m "feat(indexer): chunked getLogs sweep generator with finality/overlap constants"
```

- [ ] **Step 3: open PR2** (`git push -u origin feat/indexer-skeleton` + `gh pr create --title "feat(indexer): skeleton — chain client, cursor, chunked sweep" --body "viem client, ABI, sync_state cursor (pglite-tested), chunked getLogs generator."`)

---

# PR3 — Decode & dispatch

**Branch:** `feat/indexer-dispatch`

### Task 7 — decode helper

**Files:** Create `indexer/src/decode.ts`.

- [ ] **Step 1: `indexer/src/decode.ts`**

```ts
import { parseEventLogs, type Log } from "viem";
import { abi } from "./chain";

export function decode(logs: Log[]) {
  return parseEventLogs({ abi, logs });
}
export type LuxeniEvent = ReturnType<typeof decode>[number];
```

- [ ] **Step 2: typecheck + commit**

```bash
git add indexer/src/decode.ts
git commit -m "feat(indexer): decode logs via parseEventLogs"
```

### Task 8 — dispatcher

**Files:** Create `indexer/src/handlers/index.ts` and stub handler modules `tiles.ts`, `battlefields.ts`, `players.ts`, `seasons.ts` (signatures only, no-op bodies that the next PRs fill).

- [ ] **Step 1: stub handlers** — each file exports an async fn taking `(db, ev)` and currently `return;` (filled in PR4/PR5). Example `indexer/src/handlers/tiles.ts`:

```ts
import type { Db } from "../db/client";
export async function onTileClaimed(db: Db, ev: any): Promise<void> { /* PR4 */ }
```

Create matching stubs: `battlefields.ts` (`onBfCreated`, `onBfSettled`), `players.ts` (`onTeamJoined`, `onBfLeft`), `seasons.ts` (`onSeasonRolled`, `onMatchScoreClaimed`, `seedSeason1`).

- [ ] **Step 2: `indexer/src/handlers/index.ts`** (dispatcher with ordering)

```ts
import type { Db } from "../db/client";
import type { LuxeniEvent } from "../decode";
import { onTileClaimed } from "./tiles";
import { onBfCreated, onBfSettled } from "./battlefields";
import { onTeamJoined, onBfLeft } from "./players";
import { onSeasonRolled, onMatchScoreClaimed } from "./seasons";

function order(a: LuxeniEvent, b: LuxeniEvent) {
  if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
  return a.logIndex - b.logIndex;
}

export async function applyEvents(db: Db, events: LuxeniEvent[]): Promise<number> {
  const sorted = [...events].sort(order);
  for (const ev of sorted) {
    switch ((ev as any).eventName) {
      case "TileClaimed": await onTileClaimed(db, ev); break;
      case "BattlefieldCreated": await onBfCreated(db, ev); break;
      case "BattlefieldSettled": await onBfSettled(db, ev); break;
      case "TeamJoined": await onTeamJoined(db, ev); break;
      case "BattlefieldLeft": await onBfLeft(db, ev); break;
      case "MatchScoreClaimed": await onMatchScoreClaimed(db, ev); break;
      case "SeasonRolled": await onSeasonRolled(db, ev); break;
    }
  }
  return sorted.length;
}
```

- [ ] **Step 3: typecheck + commit**

```bash
git add indexer/src/handlers
git commit -m "feat(indexer): event dispatcher keyed by event name (block,logIndex ordered)"
```

### Task 9 — dispatcher unit test

**Files:** Create `indexer/test/dispatch.test.ts`.

- [ ] **Step 1: test that dispatch routes + orders** (uses a fake db spy; handlers are no-ops so we assert ordering via a spy injected through a tiles handler mock)

```ts
import { describe, it, expect, vi } from "vitest";
import * as tiles from "../src/handlers/tiles";
import { applyEvents } from "../src/handlers";

describe("applyEvents", () => {
  it("processes events in (block, logIndex) order", async () => {
    const seen: number[] = [];
    vi.spyOn(tiles, "onTileClaimed").mockImplementation(async (_db, ev: any) => {
      seen.push(Number(ev.args.x));
    });
    const mk = (block: bigint, logIndex: number, x: number) =>
      ({ eventName: "TileClaimed", blockNumber: block, logIndex, args: { x } } as any);
    await applyEvents({} as any, [mk(2n, 0, 30), mk(1n, 5, 10), mk(1n, 1, 20)]);
    expect(seen).toEqual([20, 10, 30]); // (1,1)->20, (1,5)->10, (2,0)->30
  });
});
```

- [ ] **Step 2: run → pass** (`cd indexer && npx vitest run test/dispatch.test.ts`).

- [ ] **Step 3: commit**

```bash
git add indexer/test/dispatch.test.ts
git commit -m "test(indexer): dispatcher routes and orders events"
```

- [ ] **Step 4: open PR3.**

---

# PR4 — Board ingestion

**Branch:** `feat/indexer-board`

### Task 10 — TileClaimed → tiles (last-write-wins)

**Files:** Modify `indexer/src/handlers/tiles.ts`. **Test:** `indexer/test/handlers.test.ts` (new).

- [ ] **Step 1: failing test (append to `indexer/test/handlers.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { eq, and } from "drizzle-orm";
import { testDb } from "./helpers";
import { onTileClaimed } from "../src/handlers/tiles";
import { tiles } from "../src/db/schema";

const tile = (x: number, y: number, team: number, owner: string, block: number, logIndex: number) =>
  ({ eventName: "TileClaimed", blockNumber: BigInt(block), logIndex,
     args: { bf: 1n, user: owner, x, y, team, prevTeam: 0 } } as any);

describe("onTileClaimed", () => {
  it("inserts then keeps newest by (block,logIndex)", async () => {
    const db = await testDb();
    await onTileClaimed(db, tile(3, 4, 1, "0xAAA", 10, 0));
    await onTileClaimed(db, tile(3, 4, 2, "0xBBB", 9, 9));   // older → ignored
    await onTileClaimed(db, tile(3, 4, 3, "0xCCC", 10, 1));  // newer → wins
    const row = (await db.select().from(tiles)
      .where(and(eq(tiles.bf, 1), eq(tiles.x, 3), eq(tiles.y, 4))))[0];
    expect(row.team).toBe(3);
    expect(row.owner).toBe("0xccc");
  });
});
```

- [ ] **Step 2: run → fail** (`npx vitest run test/handlers.test.ts`).

- [ ] **Step 3: implement `indexer/src/handlers/tiles.ts`**

```ts
import { or, lt, and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { tiles } from "../db/schema";

export async function onTileClaimed(db: Db, ev: any): Promise<void> {
  const { bf, user, x, y, team } = ev.args;
  const block = Number(ev.blockNumber);
  const logIndex = Number(ev.logIndex);
  const row = {
    bf: Number(bf), x: Number(x), y: Number(y),
    team: Number(team), owner: String(user).toLowerCase(), block, logIndex,
  };
  await db.insert(tiles).values(row).onConflictDoUpdate({
    target: [tiles.bf, tiles.x, tiles.y],
    set: { team: row.team, owner: row.owner, block, logIndex },
    where: or(lt(tiles.block, block), and(eq(tiles.block, block), lt(tiles.logIndex, logIndex))),
  });
}
```

- [ ] **Step 4: run → pass.**

- [ ] **Step 5: commit**

```bash
git add indexer/src/handlers/tiles.ts indexer/test/handlers.test.ts
git commit -m "feat(indexer): TileClaimed → tiles upsert (last-write-wins by block,logIndex)"
```

### Task 11 — BattlefieldCreated → battlefields

**Files:** Modify `indexer/src/handlers/battlefields.ts`. Test: append to `handlers.test.ts`.

- [ ] **Step 1: failing test**

```ts
import { onBfCreated } from "../src/handlers/battlefields";
import { battlefields } from "../src/db/schema";

it("BattlefieldCreated inserts a live row once", async () => {
  const db = await testDb();
  const ev = { eventName: "BattlefieldCreated", blockNumber: 1n, logIndex: 0,
    args: { bf: 7n, endTime: 1750000000n, seasonId: 1 } } as any;
  await onBfCreated(db, ev);
  await onBfCreated(db, ev); // idempotent
  const rows = await db.select().from(battlefields);
  expect(rows.length).toBe(1);
  expect(rows[0]).toMatchObject({ bf: 7, status: 1, winningTeam: 0, seasonId: 1 });
});
```

- [ ] **Step 2: implement (in `battlefields.ts`)**

```ts
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { battlefields } from "../db/schema";

export async function onBfCreated(db: Db, ev: any): Promise<void> {
  const { bf, endTime, seasonId } = ev.args;
  await db.insert(battlefields).values({
    bf: Number(bf), status: 1, endTime: Number(endTime), winningTeam: 0, seasonId: Number(seasonId),
  }).onConflictDoNothing();
}

export async function onBfSettled(db: Db, ev: any): Promise<void> { /* Task 12 */ }
```

- [ ] **Step 3: run → pass; commit**

```bash
git add indexer/src/handlers/battlefields.ts indexer/test/handlers.test.ts
git commit -m "feat(indexer): BattlefieldCreated → battlefields insert"
```

### Task 12 — BattlefieldSettled → status + winner

**Files:** Modify `indexer/src/handlers/battlefields.ts`. Test: append.

- [ ] **Step 1: failing test**

```ts
import { onBfSettled } from "../src/handlers/battlefields";

it("BattlefieldSettled updates status + winner", async () => {
  const db = await testDb();
  await onBfCreated(db, { eventName:"BattlefieldCreated", blockNumber:1n, logIndex:0,
    args:{ bf:7n, endTime:1750000000n, seasonId:1 } } as any);
  await onBfSettled(db, { eventName:"BattlefieldSettled", blockNumber:2n, logIndex:0,
    args:{ bf:7n, winningTeam:3 } } as any);
  const row = (await db.select().from(battlefields).where(eq(battlefields.bf, 7)))[0];
  expect(row).toMatchObject({ status: 2, winningTeam: 3 });
});
```

- [ ] **Step 2: implement `onBfSettled`**

```ts
export async function onBfSettled(db: Db, ev: any): Promise<void> {
  const { bf, winningTeam } = ev.args;
  await db.update(battlefields)
    .set({ status: 2, winningTeam: Number(winningTeam) })
    .where(eq(battlefields.bf, Number(bf)));
}
```

- [ ] **Step 3: run → pass; commit**

```bash
git add indexer/src/handlers/battlefields.ts indexer/test/handlers.test.ts
git commit -m "feat(indexer): BattlefieldSettled → status + winner update"
```

- [ ] **Step 4: open PR4.**

---

# PR5 — Scores, seasons, teams

**Branch:** `feat/indexer-scores-seasons`

### Task 13 — MatchScoreClaimed → match_scores

**Files:** Modify `indexer/src/handlers/seasons.ts`. Test: append.

- [ ] **Step 1: failing test**

```ts
import { onMatchScoreClaimed } from "../src/handlers/seasons";
import { matchScores } from "../src/db/schema";

it("MatchScoreClaimed upserts one row per (bf,user)", async () => {
  const db = await testDb();
  const ev = { eventName:"MatchScoreClaimed", blockNumber:1n, logIndex:0,
    args:{ bf:2n, user:"0xAbC", season:1, points:5n } } as any;
  await onMatchScoreClaimed(db, ev);
  await onMatchScoreClaimed(db, ev); // idempotent
  const rows = await db.select().from(matchScores);
  expect(rows.length).toBe(1);
  expect(rows[0]).toMatchObject({ bf:2, user:"0xabc", season:1, points:5 });
});
```

- [ ] **Step 2: implement (in `seasons.ts`)**

```ts
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { matchScores, seasons } from "../db/schema";

export async function onMatchScoreClaimed(db: Db, ev: any): Promise<void> {
  const { bf, user, season, points } = ev.args;
  await db.insert(matchScores).values({
    bf: Number(bf), user: String(user).toLowerCase(), season: Number(season), points: Number(points),
  }).onConflictDoUpdate({
    target: [matchScores.bf, matchScores.user],
    set: { season: Number(season), points: Number(points) },
  });
}

export async function onSeasonRolled(db: Db, ev: any): Promise<void> { /* Task 14 */ }
export async function seedSeason1(db: Db, seasonEnd: number): Promise<void> { /* Task 14 */ }
```

- [ ] **Step 3: run → pass; commit**

```bash
git add indexer/src/handlers/seasons.ts indexer/test/handlers.test.ts
git commit -m "feat(indexer): MatchScoreClaimed → match_scores upsert"
```

### Task 14 — SeasonRolled + seed season 1

**Files:** Modify `indexer/src/handlers/seasons.ts`. Test: append.

- [ ] **Step 1: failing test**

```ts
import { onSeasonRolled, seedSeason1 } from "../src/handlers/seasons";
import { seasons } from "../src/db/schema";

it("seeds season 1 and records rollovers", async () => {
  const db = await testDb();
  await seedSeason1(db, 1752000000);
  await seedSeason1(db, 9999999999); // idempotent: season 1 stays
  await onSeasonRolled(db, { eventName:"SeasonRolled", blockNumber:1n, logIndex:0,
    args:{ newSeason:2, endTime:1754000000n } } as any);
  const rows = await db.select().from(seasons);
  expect(rows.find(r => r.seasonId === 1)?.endTime).toBe(1752000000);
  expect(rows.find(r => r.seasonId === 2)?.endTime).toBe(1754000000);
});
```

- [ ] **Step 2: implement**

```ts
export async function onSeasonRolled(db: Db, ev: any): Promise<void> {
  const { newSeason, endTime } = ev.args;
  await db.insert(seasons).values({ seasonId: Number(newSeason), endTime: Number(endTime) })
    .onConflictDoUpdate({ target: seasons.seasonId, set: { endTime: Number(endTime) } });
}

export async function seedSeason1(db: Db, seasonEnd: number): Promise<void> {
  await db.insert(seasons).values({ seasonId: 1, endTime: seasonEnd }).onConflictDoNothing();
}
```

- [ ] **Step 3: run → pass; commit**

```bash
git add indexer/src/handlers/seasons.ts indexer/test/handlers.test.ts
git commit -m "feat(indexer): SeasonRolled → seasons upsert + seed season 1 from contract"
```

### Task 15 — TeamJoined / BattlefieldLeft → bf_players

**Files:** Modify `indexer/src/handlers/players.ts`. Test: append.

- [ ] **Step 1: failing test**

```ts
import { onTeamJoined, onBfLeft } from "../src/handlers/players";
import { bfPlayers } from "../src/db/schema";

it("join inserts/updates team; leave deletes; both idempotent", async () => {
  const db = await testDb();
  const j = (team:number) => ({ eventName:"TeamJoined", blockNumber:1n, logIndex:0,
    args:{ bf:1n, user:"0xDd", team } } as any);
  await onTeamJoined(db, j(2));
  await onTeamJoined(db, j(3)); // rejoin updates team
  expect((await db.select().from(bfPlayers))[0]).toMatchObject({ bf:1, user:"0xdd", team:3 });
  await onBfLeft(db, { eventName:"BattlefieldLeft", blockNumber:2n, logIndex:0, args:{ bf:1n, user:"0xDd" } } as any);
  await onBfLeft(db, { eventName:"BattlefieldLeft", blockNumber:2n, logIndex:1, args:{ bf:1n, user:"0xDd" } } as any); // idempotent
  expect((await db.select().from(bfPlayers)).length).toBe(0);
});
```

- [ ] **Step 2: implement `indexer/src/handlers/players.ts`**

```ts
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { bfPlayers } from "../db/schema";

export async function onTeamJoined(db: Db, ev: any): Promise<void> {
  const { bf, user, team } = ev.args;
  await db.insert(bfPlayers).values({
    bf: Number(bf), user: String(user).toLowerCase(), team: Number(team),
  }).onConflictDoUpdate({ target: [bfPlayers.bf, bfPlayers.user], set: { team: Number(team) } });
}

export async function onBfLeft(db: Db, ev: any): Promise<void> {
  const { bf, user } = ev.args;
  await db.delete(bfPlayers)
    .where(and(eq(bfPlayers.bf, Number(bf)), eq(bfPlayers.user, String(user).toLowerCase())));
}
```

- [ ] **Step 3: run → pass; commit**

```bash
git add indexer/src/handlers/players.ts indexer/test/handlers.test.ts
git commit -m "feat(indexer): TeamJoined/BattlefieldLeft → bf_players membership"
```

- [ ] **Step 4: open PR5.**

---

# PR6 — Backfill & robustness

**Branch:** `feat/indexer-backfill`

### Task 16 — deploy-block resolution + entry

**Files:** Create `indexer/src/deployBlock.ts`, `indexer/src/index.ts`.

- [ ] **Step 1: `indexer/src/deployBlock.ts`**

```ts
import type { PublicClient } from "viem";
import { LUXENI } from "./chain";

// Binary-search the first block where the contract has code. Run once if DEPLOY_BLOCK unset.
export async function resolveDeployBlock(client: PublicClient, hint?: number): Promise<number> {
  if (hint) return hint;
  let lo = 0n;
  let hi = await client.getBlockNumber();
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    const code = await client.getCode({ address: LUXENI, blockNumber: mid });
    if (code && code !== "0x") hi = mid; else lo = mid + 1n;
  }
  return Number(lo);
}
```

- [ ] **Step 2: `indexer/src/index.ts`** (one-shot entry)

```ts
import { env } from "./env";
import { client, CELO_MAINNET, LUXENI, abi } from "./chain";
import { makeDb } from "./db/client";
import { getCursor, setCursor, sweepLogs, FINALITY, OVERLAP } from "./sweep";
import { applyEvents } from "./handlers";
import { seedSeason1 } from "./handlers/seasons";
import { resolveDeployBlock } from "./deployBlock";

export async function run(): Promise<void> {
  const db = makeDb(env.databaseUrl);

  const seasonEnd = await client.readContract({ address: LUXENI, abi, functionName: "seasonEnd" }) as bigint;
  await seedSeason1(db, Number(seasonEnd));

  const deploy = await resolveDeployBlock(client as any, env.deployBlock);
  const head = Number(await client.getBlockNumber()) - FINALITY;
  const cursor = await getCursor(db, CELO_MAINNET, deploy);
  const from = Math.max(deploy, cursor - OVERLAP);

  let total = 0;
  for await (const { to, events } of sweepLogs(from, head)) {
    total += await applyEvents(db, events);
    await setCursor(db, CELO_MAINNET, to);
  }
  console.log(`[indexer] swept ${from}..${head}, applied ${total} events`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: typecheck + commit**

```bash
git add indexer/src/deployBlock.ts indexer/src/index.ts
git commit -m "feat(indexer): backfill from contract deploy block (one-shot entry)"
```

### Task 17 — finality buffer + reorg overlap (already wired; lock with a test)

**Files:** Test `indexer/test/sweep.test.ts`.

- [ ] **Step 1: test the chunker honors range + overlap math**

```ts
import { describe, it, expect } from "vitest";
import { sweepLogs } from "../src/sweep";

const fakeClient = { getLogs: async ({ fromBlock, toBlock }: any) =>
  [{ blockNumber: fromBlock, logIndex: 0 }] } as any; // 1 dummy log per chunk

describe("sweepLogs", () => {
  it("chunks [from,to] inclusively", async () => {
    const ranges: Array<[number, number]> = [];
    for await (const c of sweepLogs(100, 250, fakeClient, 100)) ranges.push([c.from, c.to]);
    expect(ranges).toEqual([[100, 199], [200, 250]]);
  });
});
```

- [ ] **Step 2: run → pass.** (Confirms inclusive chunking; FINALITY/OVERLAP applied in `index.ts`.) Commit:

```bash
git add indexer/test/sweep.test.ts
git commit -m "fix(indexer): lock finality buffer + reorg overlap chunking with a test"
```

### Task 18 — idempotency test (full replay)

**Files:** Test `indexer/test/idempotency.test.ts`.

- [ ] **Step 1: apply a mixed batch twice; assert identical state**

```ts
import { describe, it, expect } from "vitest";
import { testDb } from "./helpers";
import { applyEvents } from "../src/handlers";
import { tiles, matchScores, bfPlayers } from "../src/db/schema";

const batch = [
  { eventName:"TileClaimed", blockNumber:1n, logIndex:0, args:{ bf:1n, user:"0xA", x:0, y:0, team:1, prevTeam:0 } },
  { eventName:"TileClaimed", blockNumber:2n, logIndex:0, args:{ bf:1n, user:"0xB", x:0, y:0, team:2, prevTeam:1 } },
  { eventName:"TeamJoined", blockNumber:1n, logIndex:1, args:{ bf:1n, user:"0xA", team:1 } },
  { eventName:"MatchScoreClaimed", blockNumber:3n, logIndex:0, args:{ bf:1n, user:"0xA", season:1, points:4n } },
] as any[];

describe("idempotency", () => {
  it("re-applying the same batch yields identical state", async () => {
    const db = await testDb();
    await applyEvents(db, [...batch]);
    await applyEvents(db, [...batch]); // replay (simulates overlap re-scan)
    expect((await db.select().from(tiles)).length).toBe(1);
    expect((await db.select().from(tiles))[0]).toMatchObject({ team: 2, owner: "0xb" });
    expect((await db.select().from(matchScores)).length).toBe(1);
    expect((await db.select().from(bfPlayers)).length).toBe(1);
  });
});
```

- [ ] **Step 2: run full suite → pass; commit**

Run: `cd indexer && npm test` → Expected: all test files PASS.

```bash
git add indexer/test/idempotency.test.ts
git commit -m "test(indexer): idempotency — re-applying events is a no-op"
```

- [ ] **Step 3: open PR6.**

---

# PR7 — Cron / CI

**Branch:** `feat/indexer-cron`

### Task 19 — one-shot run mode hardening

**Files:** Modify `indexer/src/index.ts` (guard: skip if already at head; clearer logs).

- [ ] **Step 1: add early-exit + structured log** — wrap the sweep:

```ts
  if (from > head) { console.log(`[indexer] up to date at ${head}`); return; }
```
Insert right after computing `from` and `head`.

- [ ] **Step 2: typecheck + commit**

```bash
git add indexer/src/index.ts
git commit -m "feat(indexer): one-shot catch-up run mode (early-exit when current)"
```

### Task 20 — GitHub Actions cron

**Files:** Create `.github/workflows/indexer.yml`.

- [ ] **Step 1: `.github/workflows/indexer.yml`**

```yaml
name: indexer
on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch: {}
concurrency:
  group: indexer
  cancel-in-progress: false
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
        working-directory: indexer
      - run: npm start
        working-directory: indexer
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CELO_RPC_URL: ${{ secrets.CELO_RPC_URL }}
```

- [ ] **Step 2: commit**

```bash
git add .github/workflows/indexer.yml
git commit -m "ci: GitHub Actions cron workflow (every 5 min)"
```

### Task 21 — env/secrets docs

**Files:** Modify `indexer/README.md` (add Deployment section).

- [ ] **Step 1: append**

````markdown
## Deployment (free)
- **Neon:** create a project; copy the pooled connection string.
- **GitHub repo secrets:** `DATABASE_URL`, `CELO_RPC_URL` (Settings → Secrets → Actions).
- **Apply schema once:** locally with `.env` set → `npm run db:migrate`.
- The cron (`.github/workflows/indexer.yml`) runs `npm start` every ~5 min.
- Trigger manually: Actions tab → indexer → Run workflow.

> Scheduled workflows are best-effort (a few min of drift) and auto-disable after 60
> days of repo inactivity — any commit re-enables them.
````

- [ ] **Step 2: commit + open PR7**

```bash
git add indexer/README.md
git commit -m "docs(indexer): env, secrets, and deployment instructions"
```

> **Manual setup (user, once):** add `DATABASE_URL` + `CELO_RPC_URL` as GitHub repo secrets; ensure repo is public (free Actions) or accept the 2,000 min/mo private allowance.

---

# PR8 — API: leaderboard

**Branch:** `feat/api-leaderboard`

### Task 22 — Neon SQL client for Next + frontend dep

**Files:** Modify `frontend/package.json`; create `frontend/lib/db.ts`.

- [ ] **Step 1: add dep** — Run: `cd frontend && npm install @neondatabase/serverless@^0.10.0`

- [ ] **Step 2: `frontend/lib/db.ts`**

```ts
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  // Routes throw a clear error instead of a cryptic driver failure.
  console.warn("DATABASE_URL not set — indexer API routes will fail.");
}
export const sql = neon(process.env.DATABASE_URL ?? "");
```

- [ ] **Step 3: commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/db.ts
git commit -m "feat(api): Neon serverless SQL client for Next.js routes"
```

### Task 23 — GET /api/leaderboard (Top 100)

**Files:** Create `frontend/app/api/leaderboard/route.ts`.

- [ ] **Step 1: route (Top 100, season-aware)**

```ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";

async function latestSeason(): Promise<number> {
  const r = await sql`SELECT COALESCE(MAX(season_id), 1) AS s FROM seasons`;
  return Number(r[0].s);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season")) || (await latestSeason());
  const me = url.searchParams.get("me")?.toLowerCase() || null;

  const top = await sql`
    SELECT "user", SUM(points)::bigint AS score,
           RANK() OVER (ORDER BY SUM(points) DESC) AS rank
    FROM match_scores WHERE season = ${season}
    GROUP BY "user" ORDER BY score DESC LIMIT 100`;

  return NextResponse.json(
    { season, top: top.map((r: any) => ({ rank: Number(r.rank), user: r.user, score: Number(r.score) })), me: null, _me: me },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
  );
}
```

- [ ] **Step 2: manual verify** (requires Neon with data, or empty) — Run frontend dev, `curl "http://localhost:3000/api/leaderboard"` → Expected: JSON `{season, top: [...]}` (empty `top` if no data). Commit:

```bash
git add frontend/app/api/leaderboard/route.ts
git commit -m "feat(api): GET /api/leaderboard — Top 100 by season (SUM points)"
```

### Task 24 — self-rank via RANK()

**Files:** Modify `frontend/app/api/leaderboard/route.ts`.

- [ ] **Step 1: add self-rank query before the response, set `me`**

```ts
  let meRow: { rank: number; score: number } | null = null;
  if (me) {
    const r = await sql`
      WITH ranked AS (
        SELECT "user", SUM(points) AS score,
               RANK() OVER (ORDER BY SUM(points) DESC) AS rank
        FROM match_scores WHERE season = ${season} GROUP BY "user")
      SELECT rank, score FROM ranked WHERE "user" = ${me}`;
    if (r[0]) meRow = { rank: Number(r[0].rank), score: Number(r[0].score) };
  }
```
Then replace the JSON `me: null, _me: me` with `me: meRow` (drop `_me`).

- [ ] **Step 2: manual verify** — `curl "http://localhost:3000/api/leaderboard?me=0x..."` → `me` is `{rank,score}` or `null`. Commit:

```bash
git add frontend/app/api/leaderboard/route.ts
git commit -m "feat(api): self-rank via RANK() OVER for ?me="
```

- [ ] **Step 3: open PR8.**

---

# PR9 — API: board / teams / seasons

**Branch:** `feat/api-board-teams-seasons`

### Task 25 — GET /api/battlefield/[bf]

**Files:** Create `frontend/app/api/battlefield/[bf]/route.ts`.

- [ ] **Step 1: route**

```ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { bf: string } }) {
  const bf = Number(params.bf);
  if (!Number.isInteger(bf) || bf < 1) return NextResponse.json({ error: "bad bf" }, { status: 400 });

  const meta = (await sql`
    SELECT bf, status, end_time AS "endTime", winning_team AS "winningTeam", season_id AS "seasonId"
    FROM battlefields WHERE bf = ${bf}`)[0] ?? null;
  const tiles = await sql`SELECT x, y, team, "owner" FROM tiles WHERE bf = ${bf}`;

  return NextResponse.json(
    { bf, meta, tiles },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
  );
}
```

- [ ] **Step 2: commit**

```bash
git add "frontend/app/api/battlefield/[bf]/route.ts"
git commit -m "feat(api): GET /api/battlefield/[bf] — sparse claimed tiles + meta"
```

### Task 26 — GET /api/teams/[bf]

**Files:** Create `frontend/app/api/teams/[bf]/route.ts`.

- [ ] **Step 1: route**

```ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { bf: string } }) {
  const bf = Number(params.bf);
  if (!Number.isInteger(bf) || bf < 1) return NextResponse.json({ error: "bad bf" }, { status: 400 });

  const tiles = await sql`SELECT team, COUNT(*)::int AS n FROM tiles WHERE bf=${bf} GROUP BY team`;
  const players = await sql`SELECT team, COUNT(*)::int AS n FROM bf_players WHERE bf=${bf} GROUP BY team`;
  const byTeam = (rows: any[]) => Object.fromEntries(rows.map((r) => [Number(r.team), Number(r.n)]));
  const t = byTeam(tiles), p = byTeam(players);

  return NextResponse.json(
    { bf, teams: [1, 2, 3, 4].map((team) => ({ team, tiles: t[team] ?? 0, players: p[team] ?? 0 })) },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } },
  );
}
```

- [ ] **Step 2: commit**

```bash
git add "frontend/app/api/teams/[bf]/route.ts"
git commit -m "feat(api): GET /api/teams/[bf] — tile + player standings per team"
```

### Task 27 — GET /api/seasons

**Files:** Create `frontend/app/api/seasons/route.ts`.

- [ ] **Step 1: route**

```ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await sql`SELECT season_id AS "seasonId", end_time AS "endTime" FROM seasons ORDER BY season_id DESC`;
  return NextResponse.json(
    { seasons: rows.map((r: any) => ({ seasonId: Number(r.seasonId), endTime: Number(r.endTime) })) },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
```

- [ ] **Step 2: commit + open PR9**

```bash
git add frontend/app/api/seasons/route.ts
git commit -m "feat(api): GET /api/seasons — archive list + cache headers"
```

---

# PR10 — Frontend integration

**Branch:** `feat/frontend-leaderboard`

### Task 28 — typed API client

**Files:** Create `frontend/lib/indexer.ts`.

- [ ] **Step 1: `frontend/lib/indexer.ts`**

```ts
export type LeaderRow = { rank: number; user: string; score: number };
export type Leaderboard = { season: number; top: LeaderRow[]; me: { rank: number; score: number } | null };
export type TeamStanding = { team: number; tiles: number; players: number };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const getLeaderboard = (season?: number, me?: string) =>
  get<Leaderboard>(`/api/leaderboard?${new URLSearchParams({
    ...(season ? { season: String(season) } : {}), ...(me ? { me } : {}),
  })}`);
export const getTeams = (bf: number) => get<{ bf: number; teams: TeamStanding[] }>(`/api/teams/${bf}`);
```

- [ ] **Step 2: typecheck + commit**

```bash
git add frontend/lib/indexer.ts
git commit -m "feat(frontend): typed indexer API client + types"
```

### Task 29 — Leaderboard panel

**Files:** Create `frontend/app/app/_components/Leaderboard.tsx`; modify `frontend/app/app/page.tsx` (render it).

- [ ] **Step 1: `frontend/app/app/_components/Leaderboard.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { getLeaderboard, type Leaderboard } from "../../../lib/indexer";

export function LeaderboardPanel({ season, me }: { season?: number; me?: string }) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let on = true;
    getLeaderboard(season, me).then((d) => on && setData(d)).catch((e) => on && setErr(String(e)));
    return () => { on = false; };
  }, [season, me]);

  return (
    <div className="panel">
      <p className="panel-label">The Rolls of Glory</p>
      {err && <p className="board-note">leaderboard offline</p>}
      {!data && !err && <p className="board-note">…</p>}
      {data && (
        <>
          {data.top.length === 0 && <p className="board-note">No names yet. Be the first to hold ground.</p>}
          {data.top.map((r) => (
            <div key={r.user} className="row" style={{ opacity: me && r.user === me.toLowerCase() ? 1 : 0.85 }}>
              <span className="lbl">#{r.rank} · {r.user.slice(0, 6)}…{r.user.slice(-4)}</span>
              <span className="val">{r.score}</span>
            </div>
          ))}
          {data.me && !data.top.some((r) => r.user === me?.toLowerCase()) && (
            <div className="row" style={{ marginTop: 8 }}>
              <span className="lbl">#{data.me.rank} · you</span>
              <span className="val">{data.me.score}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: render in War Room** — in `frontend/app/app/page.tsx`, import and place `<LeaderboardPanel season={season ? Number(season) : undefined} me={address} />` inside the connected block (after the treasury panel). Import at top:

```tsx
import { LeaderboardPanel } from "./_components/Leaderboard";
```

- [ ] **Step 3: typecheck + commit**

```bash
git add "frontend/app/app/_components/Leaderboard.tsx" "frontend/app/app/page.tsx"
git commit -m "feat(frontend): Leaderboard panel (Top 100 + your rank) in War Room"
```

### Task 30 — team standings + full-board overview

**Files:** Modify `frontend/app/app/_components/Leaderboard.tsx` (add a small `TeamStandings` export) and render in `page.tsx` for the active `bf`.

- [ ] **Step 1: add `TeamStandings` component** (same file)

```tsx
import { getTeams, type TeamStanding } from "../../../lib/indexer";
import { TEAM_NAMES, TEAM_COLORS } from "../../../lib/contract";

export function TeamStandings({ bf }: { bf: number }) {
  const [teams, setTeams] = useState<TeamStanding[] | null>(null);
  useEffect(() => {
    if (!bf) return;
    let on = true;
    getTeams(bf).then((d) => on && setTeams(d.teams)).catch(() => on && setTeams(null));
    return () => { on = false; };
  }, [bf]);
  if (!teams) return null;
  return (
    <div className="panel">
      <p className="panel-label">Banners of Battlefield #{bf}</p>
      <div className="team-grid">
        {teams.map((t) => (
          <div key={t.team} className="team-cell" style={{ borderTopColor: TEAM_COLORS[t.team] }}>
            <div className="t-name" style={{ color: TEAM_COLORS[t.team], filter: "brightness(1.6)" }}>{TEAM_NAMES[t.team]}</div>
            <div className="t-count">{t.tiles} tiles · {t.players}p</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: render** — in `page.tsx`, when `joined && bf`, add `<TeamStandings bf={Number(bf)} />` near the battlefield panel; import it alongside `LeaderboardPanel`.

- [ ] **Step 3: typecheck + commit + open PR10**

```bash
git add "frontend/app/app/_components/Leaderboard.tsx" "frontend/app/app/page.tsx"
git commit -m "feat(frontend): team standings + full-board overview from API"
```

---

## Self-review checklist (run before execution)

- [ ] **Spec coverage:** backfill+tail (PR2/6/7) · leaderboard+self-rank (PR8) · board recon (PR9) · team standings (PR9) · season archive (PR5/PR9) · frontend serve (PR10) · idempotent writes (PR4/5 + test PR6) · read-only (no signer anywhere). ✅
- [ ] **Placeholders:** stub handlers in Task 8 are filled in Tasks 10–15 (explicitly cross-referenced). No TBDs. ✅
- [ ] **Type consistency:** `Db` type from `db/client.ts` used in all handlers; `applyEvents`/`decode`/`sweepLogs` signatures consistent across PRs; addresses lowercased on every write and in every `me` query. ✅

## Credentials needed from the user (when those tasks run)
- **PR1 Task 3 (`db:migrate`) & any API manual verify:** `DATABASE_URL` in `indexer/.env` (local) — never pasted in chat.
- **PR7:** `DATABASE_URL` + `CELO_RPC_URL` as **GitHub repo secrets**; repo public (or accept private Actions minutes).
- **PR8–10 (live data verify / deploy):** `DATABASE_URL` in **Vercel** project env.

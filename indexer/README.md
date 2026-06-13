# Luxeni — Leaderboard Indexer

Read-only Node ingestor: sweeps `Luxeni` contract events → Neon Postgres → served by
`frontend/app/api/*`. On-chain is the source of truth; the DB is a rebuildable cache.

Contract address, chain id, ABI, and event decoding come from the published
[`luxeni-sdk`](https://www.npmjs.com/package/luxeni-sdk) package (single source of truth).

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

## Tables
`sync_state` (cursor) · `tiles` (board, last-write-wins) · `battlefields` (lifecycle) ·
`bf_players` (membership) · `match_scores` (per-match score) · `seasons` (archive).

See `docs/superpowers/specs/2026-06-11-luxeni-indexer-backend-design.md`.

## Deployment (free)
- **Neon:** create a project; copy the pooled connection string.
- **GitHub repo secrets** (Settings → Secrets → Actions): `DATABASE_URL`, `CELO_RPC_URL`.
- **Apply schema once:** locally with `.env` set → `npm run db:migrate`.
- The cron (`.github/workflows/indexer.yml`) runs `npm start` every ~5 min; trigger manually via
  Actions tab → indexer → Run workflow.

> Scheduled workflows are best-effort (a few minutes of drift) and auto-disable after 60 days of
> repo inactivity — any commit re-enables them. Public repo → free unlimited Actions; private →
> 2,000 min/mo (a 5-min cron fits).

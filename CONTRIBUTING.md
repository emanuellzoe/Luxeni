# Contributing to Luxeni

Monorepo: `celo-contracts/` (Solidity/Foundry), `frontend/` (Next.js MiniApp),
`sdk/` (shared addresses + ABIs), `indexer/` (leaderboard), `docs/` (specs).

## Setup
```bash
# contracts
cd celo-contracts && forge test
# frontend
cd frontend && npm install && npm run dev
```

## Workflow
- Branch from `main`: `feat/…`, `fix/…`, `docs/…`, `test/…`, `chore/…`.
- Keep PRs focused and meaningful (real changes — no padding commits).
- Conventional commits (`feat(scope): …`). Contracts: add/keep Foundry tests green.
- Never commit secrets; `.env*` is gitignored (`.env.example` only).

## Guardrails
- No unbounded loops in contracts; accumulate at write.
- Metrics must come from genuine play — bots only for **testnet** load-testing.

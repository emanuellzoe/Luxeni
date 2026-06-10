# Spec: Zone tallies (zone-based win condition)

## Goal
Win a battlefield by controlling the most **zones**, not raw tile count. The board is split into
zones; a zone is controlled by the team holding the majority of its tiles.

## Design (must stay O(1) — no loops over tiles)
- Divide the 80×80 board into a grid of zones (e.g. 10×10 → 100 zones of 8×8 tiles).
- Maintain incremental counters, updated on every `claimTile`:
  - `zoneTeamCount[bf][zone][team]` — tiles per team per zone
  - `zoneController[bf][zone]` — current majority team (recompute only for the touched zone)
  - `teamZoneTally[bf][team]` — zones controlled per team
- On claim: decrement old team's zone count, increment new team's; if the touched zone's majority
  flips, update `zoneController` and `teamZoneTally`. All O(1).
- `settle` chooses winner = `argmax(teamZoneTally)` over 4 teams (bounded).

## Acceptance criteria
- [ ] No unbounded loops; claim stays ~O(1)
- [ ] `settle` winner derived from zones, not `teamTiles`
- [ ] Tests: zone flip on majority change; tie handling; winner-by-zones
- [ ] `ZoneCaptured(bf, zone, team)` event for the indexer

## Integration
Extend `celo-contracts/src/Luxeni.sol` (`claimTile`, `settle`) + add `zoneOf(x,y)` pure helper.

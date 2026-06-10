# Spec: UUPS upgradeability + governance

## Goal
Make the game contract upgradeable so rules/parameters can evolve, controlled by a **timelock + multisig**.

## Design
- Convert `Luxeni` to an OZ **UUPS** implementation: `Initializable` + `UUPSUpgradeable` +
  `OwnableUpgradeable`; replace `constructor` with `initialize()`; `_authorizeUpgrade` gated by owner.
- Deploy behind an ERC1967 proxy. Owner = **TimelockController** governed by a **multisig (Safe)**.
- Keep the storage layout append-only (document a storage gap) to stay upgrade-safe.

## Acceptance criteria
- [ ] Proxy + implementation deploy script
- [ ] `initialize` sets season 1 / seasonEnd (was constructor)
- [ ] Upgrade authorized only via timelock+multisig
- [ ] Storage layout doc + `__gap`
- [ ] Tests: upgrade preserves state; unauthorized upgrade reverts

## Trade-off (document in README)
Upgradeability adds trust assumptions; mitigated by timelock + multisig and transparency.
NOTE: the **already-deployed** non-proxy mainnet instance stays as the MVP; the proxy version is a
follow-up deployment (new addresses) — coordinate migration before switching the frontend.

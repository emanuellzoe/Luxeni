# Luxeni — Deployments

## 🟢 Celo Mainnet (chainId 42220)
> Deployed & verified 2026-06-10

| Contract | Address | Explorer |
|---|---|---|
| `Luxeni` | `0x82064c90A86BA16d81Dd1fb16374D78A70d59e70` | [Celoscan](https://celoscan.io/address/0x82064c90a86ba16d81dd1fb16374d78a70d59e70#code) |
| `LuxeniKeepsake` | `0x9e22Dff36a5494B6601C9ffAd57d78C26de6ca25` | [Celoscan](https://celoscan.io/address/0x9e22dff36a5494b6601c9ffad57d78c26de6ca25#code) |

- **Owner:** `0x34b42a1BD9398A0c95812c09F55AD9Dae3d17F08`
- **Keepsake constructor:** `(game = Luxeni, owner)`
- Both contracts **verified** on Celoscan (source visible).

### Notes for FE/SDK
- Network: Celo Mainnet, RPC `https://forno.celo.org`, chainId `42220`.
- Read constants live, e.g. `LUX_PER_NATIVE() = 1000`, `currentSeason() = 1`.
- Reconstruct board + leaderboard from events (`TileClaimed`, `BattlefieldSettled`, `MatchScoreClaimed`, …).

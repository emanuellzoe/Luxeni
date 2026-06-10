# Luxeni — Frontend (MiniApp)

Mobile-first MiniApp (MiniPay on Celo) for Luxeni Territory War. Wire to the **live, verified**
mainnet contracts using ABIs + addresses from [`@luxeni/sdk`](../sdk).

## Stack (target)
Next.js + React · viem/wagmi · Tailwind · MiniPay auto-connect (`window.ethereum.isMiniPay`).

## Wiring (ABI ready — see ../sdk)
```ts
import { addresses, rpc, CELO_MAINNET, LuxeniAbi } from "@luxeni/sdk";
// reads: energyOf, battlefields, tiles, teamTiles, playerHeld, currentSeason, seasonScore
// writes: buyLux (payable), withdrawLux, createBattlefield, joinBattlefield, claimTile, settle, claimMatchScore
```

## Screens
- **Connect** (auto inside MiniPay), **Buy LUX**, **Arena/Battlefield** (grid + claim), **Profile** (held tiles, season score, keepsakes), **Leaderboard**.

## Board rendering
Reconstruct the board from `TileClaimed` events (don't read 6400 tiles). Subscribe + paint.

## TASKS
- [ ] Scaffold Next.js + wagmi/viem + Tailwind
- [ ] MiniPay connector + Celo Mainnet (42220) network guard
- [ ] Buy/withdraw LUX UI (energyOf display)
- [ ] Battlefield grid + claimTile (cooldown/cost UX)
- [ ] Event-driven board renderer
- [ ] Profile (playerHeld, seasonScore, mint keepsake)
- [ ] Leaderboard (from indexer)

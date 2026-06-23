// Maps raw on-chain revert reasons (and common wallet errors) to clear,
// player-facing messages. The contract's require() strings are terse —
// "must be adjacent", "already your team" — so we translate them into
// guidance a soldier in the War Room can act on.

export type FriendlyError = { title: string; message: string };

// revert-reason substring -> friendly copy. Order matters: first hit wins.
const MAP: Array<[RegExp, FriendlyError]> = [
  // --- claiming a tile / contested ground ---
  [/must be adjacent/i, {
    title: "Too Far Away",
    message: "You can only claim a tile that's right next to one you already own. Pick a tile touching your territory.",
  }],
  [/already your team/i, {
    title: "Already Yours",
    message: "You already own this tile — nothing to claim here.",
  }],
  [/out of bounds/i, {
    title: "Off the Map",
    message: "That tile is outside the map. Pick a tile within the 80×80 grid.",
  }],
  // --- energy / treasury ---
  [/not enough energy/i, {
    title: "Not Enough Energy",
    message: "You're out of LUX for this claim. Buy more in Your Wallet above, or wait — it refills for free, 1 LUX every 20 minutes.",
  }],
  [/in cooldown/i, {
    title: "Wait a Moment",
    message: "You just made a move — give it a few seconds before claiming again.",
  }],
  [/amount too small|bad amount|no value/i, {
    title: "Invalid Amount",
    message: "The CELO amount is too small or invalid. Enter a larger amount and try again.",
  }],
  [/nothing to claim/i, {
    title: "Nothing to Claim",
    message: "There are no points to claim from this game.",
  }],
  // --- battlefield lifecycle / matchmaking ---
  [/battlefield not live|not live/i, {
    title: "Game Has Ended",
    message: "This game is no longer live. Join or start a new game to keep playing.",
  }],
  [/team full/i, {
    title: "Team Full",
    message: "This team is full. Try again — you'll be placed on the smallest team.",
  }],
  [/already joined/i, {
    title: "Already Joined",
    message: "You've already joined this game.",
  }],
  [/join a team first|not in battlefield/i, {
    title: "Join a Team First",
    message: "You need to join a game before you can claim tiles.",
  }],
  [/max 3 concurrent|no free slot/i, {
    title: "Too Many Games",
    message: "You're already in three games at once. Finish one before joining another.",
  }],
  [/bad team/i, {
    title: "Invalid Team",
    message: "That team doesn't exist. Choose one of the four teams.",
  }],
  [/not ended|not settled/i, {
    title: "Game Not Settled Yet",
    message: "This game hasn't been settled yet. Tap \"End Game\" first, then claim your points.",
  }],
  [/already claimed/i, {
    title: "Points Already Claimed",
    message: "You've already claimed your points from this game.",
  }],
  [/forfeited/i, {
    title: "You Left This Game",
    message: "You left this game, so your spot here no longer counts.",
  }],
  // --- wallet / network ---
  [/user rejected|user denied|rejected the request/i, {
    title: "Transaction Cancelled",
    message: "You dismissed the request in your wallet. Nothing was sent.",
  }],
  [/insufficient funds/i, {
    title: "Not Enough CELO",
    message: "Your wallet lacks the CELO to cover this transaction and its gas.",
  }],
];

/**
 * Turn any wallet / contract error (or its message) into player-facing copy.
 * Returns null when there is genuinely no error to show.
 */
export function friendlyError(raw: unknown): FriendlyError | null {
  if (!raw) return null;
  const text =
    (raw as any)?.shortMessage ||
    (raw as any)?.details ||
    (raw as any)?.message ||
    (typeof raw === "string" ? raw : "");
  if (!text) return null;

  for (const [re, friendly] of MAP) {
    if (re.test(text)) return friendly;
  }

  // Unknown revert — strip the noisy prefix and surface the bare reason.
  const cleaned = text
    .replace(/^.*reverted with the following reason:\s*/s, "")
    .replace(/^.*execution reverted:?\s*/is, "")
    .split("\n")[0]
    .slice(0, 160)
    .trim();
  return {
    title: "Action Failed",
    message: cleaned || "The transaction was rejected by the chain. Please try again.",
  };
}

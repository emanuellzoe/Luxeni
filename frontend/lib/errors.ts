// Maps raw on-chain revert reasons (and common wallet errors) to clear,
// player-facing messages. The contract's require() strings are terse —
// "must be adjacent", "already your team" — so we translate them into
// guidance a soldier in the War Room can act on.

export type FriendlyError = { title: string; message: string };

// revert-reason substring -> friendly copy. Order matters: first hit wins.
const MAP: Array<[RegExp, FriendlyError]> = [
  // --- claiming a tile / contested ground ---
  [/must be adjacent/i, {
    title: "Ground Out of Reach",
    message: "You can only seize a tile that borders ground your banner already holds. Pick a tile orthogonally adjacent to your territory.",
  }],
  [/already your team/i, {
    title: "Already Yours",
    message: "This tile already flies your banner — there is nothing here to take.",
  }],
  [/out of bounds/i, {
    title: "Beyond the Map",
    message: "That tile lies outside the battlefield. Choose a tile within the 80×80 field.",
  }],
  // --- energy / treasury ---
  [/not enough energy/i, {
    title: "Energy Spent",
    message: "You lack the LUX to seal this claim. Buy LUX in the Treasury — energy refills 1 LUX every 20 minutes.",
  }],
  [/in cooldown/i, {
    title: "Catch Your Breath",
    message: "You are in cooldown after your last move. Wait a moment before claiming again.",
  }],
  [/amount too small|bad amount|no value/i, {
    title: "Invalid Amount",
    message: "The CELO amount is too small or invalid. Enter a larger amount and try again.",
  }],
  [/nothing to claim/i, {
    title: "Nothing to Claim",
    message: "There is no score to claim from this battle.",
  }],
  // --- battlefield lifecycle / matchmaking ---
  [/battlefield not live|not live/i, {
    title: "The War Has Ended",
    message: "This battlefield is no longer live. Find or raise a new battlefield to keep fighting.",
  }],
  [/team full/i, {
    title: "Banner Full",
    message: "This banner has no room left. Try again — you'll be placed with the smallest banner.",
  }],
  [/already joined/i, {
    title: "Already Enlisted",
    message: "You have already joined this battlefield.",
  }],
  [/join a team first|not in battlefield/i, {
    title: "Join a Banner First",
    message: "You must enlist on a battlefield before you can claim ground.",
  }],
  [/max 3 concurrent|no free slot/i, {
    title: "Stretched Too Thin",
    message: "You are already fighting on three battlefields at once. Conclude one before joining another.",
  }],
  [/bad team/i, {
    title: "Unknown Banner",
    message: "That banner is not valid. Choose one of the four factions.",
  }],
  [/not ended|not settled/i, {
    title: "Not Yet Concluded",
    message: "This war has not been settled yet. Seal the war first, then claim your score.",
  }],
  [/already claimed/i, {
    title: "Score Already Claimed",
    message: "You have already claimed your score from this battle.",
  }],
  [/forfeited/i, {
    title: "Position Forfeited",
    message: "You have left this battlefield and forfeited your standing here.",
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
    title: "The Claim Was Refused",
    message: cleaned || "The transaction was rejected by the chain. Please try again.",
  };
}

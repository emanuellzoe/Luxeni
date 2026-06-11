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

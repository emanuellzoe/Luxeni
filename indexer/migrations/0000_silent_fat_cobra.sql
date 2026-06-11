CREATE TABLE IF NOT EXISTS "battlefields" (
	"bf" bigint PRIMARY KEY NOT NULL,
	"status" smallint NOT NULL,
	"end_time" bigint NOT NULL,
	"winning_team" smallint DEFAULT 0 NOT NULL,
	"season_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bf_players" (
	"bf" bigint NOT NULL,
	"user" text NOT NULL,
	"team" smallint NOT NULL,
	CONSTRAINT "bf_players_bf_user_pk" PRIMARY KEY("bf","user")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_scores" (
	"bf" bigint NOT NULL,
	"user" text NOT NULL,
	"season" integer NOT NULL,
	"points" bigint NOT NULL,
	CONSTRAINT "match_scores_bf_user_pk" PRIMARY KEY("bf","user")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seasons" (
	"season_id" integer PRIMARY KEY NOT NULL,
	"end_time" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_state" (
	"chain_id" integer PRIMARY KEY NOT NULL,
	"last_block" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tiles" (
	"bf" bigint NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"team" smallint NOT NULL,
	"owner" text NOT NULL,
	"block" bigint NOT NULL,
	"log_index" integer NOT NULL,
	CONSTRAINT "tiles_bf_x_y_pk" PRIMARY KEY("bf","x","y")
);

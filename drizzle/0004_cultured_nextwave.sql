CREATE TABLE IF NOT EXISTS "warn_thresholds" (
	"id" serial NOT NULL,
	"guild_id" varchar(28) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"min_warns" integer NOT NULL,
	"actions" varchar(16)[] NOT NULL
);

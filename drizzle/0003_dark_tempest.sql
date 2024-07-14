CREATE TABLE IF NOT EXISTS "member_warns" (
	"guild_id" varchar(28) NOT NULL,
	"user_id" varchar(28) NOT NULL,
	"moderator_id" varchar(28) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

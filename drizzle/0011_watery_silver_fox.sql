DO $$ BEGIN
 CREATE TYPE "public"."threshold_type" AS ENUM('positive', 'negative');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_credits" (
	"guild_id" varchar(28) NOT NULL,
	"user_id" varchar(28) NOT NULL,
	"credits" integer DEFAULT 500 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_credits_thresholds" (
	"guild_id" varchar(28) NOT NULL,
	"threshold_type" "threshold_type" NOT NULL,
	"amount" integer NOT NULL,
	"role" varchar(28) NOT NULL
);

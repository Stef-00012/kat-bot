CREATE TABLE IF NOT EXISTS "starboard_configs" (
	"guildId" varchar(28) PRIMARY KEY NOT NULL,
	"channel_id" varchar(28) NOT NULL,
	"min_stars" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "starboard_messages" (
	"message_id" varchar(28) PRIMARY KEY NOT NULL,
	"channel_id" varchar(28) NOT NULL,
	"starCount" integer NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "starboard_configs" ADD CONSTRAINT "starboard_configs_guildId_guilds_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

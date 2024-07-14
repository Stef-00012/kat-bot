ALTER TABLE "starboard_configs" ALTER COLUMN "min_stars" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "starboard_messages" ADD COLUMN "posted_message_id" varchar(28) NOT NULL;
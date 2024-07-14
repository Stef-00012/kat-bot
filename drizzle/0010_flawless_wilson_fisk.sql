CREATE TABLE IF NOT EXISTS "starboard_reactors" (
	"message_id" varchar(28) NOT NULL,
	"reactor_id" varchar(28) NOT NULL,
	"reacted_at" timestamp DEFAULT now() NOT NULL
);

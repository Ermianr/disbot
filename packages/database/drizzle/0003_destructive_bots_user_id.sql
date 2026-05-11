DROP TABLE IF EXISTS "bots" CASCADE;
--> statement-breakpoint
CREATE TABLE "bots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"config" jsonb DEFAULT '{"triggers":[]}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

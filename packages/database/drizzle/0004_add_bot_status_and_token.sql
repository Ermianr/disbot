CREATE TYPE "public"."bot_status" AS ENUM('draft', 'enabled', 'disabled', 'error', 'rate_limited');
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "status" "bot_status" DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "discord_token" text;
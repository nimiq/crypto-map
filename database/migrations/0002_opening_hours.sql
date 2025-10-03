ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "timezone" text;--> statement-breakpoint
UPDATE "locations" SET "timezone" = 'Europe/Zurich' WHERE "timezone" IS NULL;--> statement-breakpoint
ALTER TABLE "locations" ALTER COLUMN "timezone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "opening_hours" text;

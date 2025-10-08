-- Add embedding column if it doesn't exist (for pgvector semantic search)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);--> statement-breakpoint

-- Remove created_at column from categories table
ALTER TABLE "categories" DROP COLUMN IF EXISTS "created_at";

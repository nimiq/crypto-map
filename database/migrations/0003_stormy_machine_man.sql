-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "locations_embedding_idx" ON "locations" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);
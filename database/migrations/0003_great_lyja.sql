ALTER TABLE "categories" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "categories_embedding_idx" ON "categories" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16, ef_construction=64);--> statement-breakpoint
CREATE INDEX "locations_embedding_idx" ON "locations" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16, ef_construction=64);
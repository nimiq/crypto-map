CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "category_hierarchies" (
	"child_id" text NOT NULL,
	"parent_id" text NOT NULL,
	"created_at" timestamp DEFAULT NOW(),
	CONSTRAINT "category_hierarchies_child_id_parent_id_pk" PRIMARY KEY("child_id","parent_id")
);
--> statement-breakpoint
CREATE TABLE "location_categories" (
	"location_uuid" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT NOW(),
	CONSTRAINT "location_categories_location_uuid_category_id_pk" PRIMARY KEY("location_uuid","category_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"uuid" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"postal_code" text NOT NULL,
	"region" text,
	"country" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"rating" double precision,
	"rating_count" double precision,
	"photo" text,
	"gmaps_place_id" text NOT NULL,
	"gmaps_url" text NOT NULL,
	"website" text,
	"source" varchar(20) NOT NULL,
	"timezone" text NOT NULL,
	"opening_hours" text,
	"updated_at" timestamp DEFAULT NOW(),
	"created_at" timestamp DEFAULT NOW(),
	CONSTRAINT "locations_gmaps_place_id_unique" UNIQUE("gmaps_place_id")
);
--> statement-breakpoint
ALTER TABLE "category_hierarchies" ADD CONSTRAINT "category_hierarchies_child_id_categories_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_hierarchies" ADD CONSTRAINT "category_hierarchies_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_categories" ADD CONSTRAINT "location_categories_location_uuid_locations_uuid_fk" FOREIGN KEY ("location_uuid") REFERENCES "public"."locations"("uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_categories" ADD CONSTRAINT "location_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_embedding_idx" ON "categories" USING hnsw (embedding vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "category_hierarchies_child_idx" ON "category_hierarchies" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "category_hierarchies_parent_idx" ON "category_hierarchies" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "location_idx" ON "location_categories" USING btree ("location_uuid");--> statement-breakpoint
CREATE INDEX "category_idx" ON "location_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "location_spatial_idx" ON "locations" USING gist ("location");--> statement-breakpoint

-- Trigger function to enforce parent category existence on INSERT/UPDATE
CREATE OR REPLACE FUNCTION enforce_category_hierarchy_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  required_parent_id TEXT;
BEGIN
  -- Check if the category being added requires a parent
  FOR required_parent_id IN
    SELECT parent_id
    FROM category_hierarchies
    WHERE child_id = NEW.category_id
  LOOP
    -- Check if this location already has the required parent
    IF NOT EXISTS (
      SELECT 1
      FROM location_categories
      WHERE location_uuid = NEW.location_uuid
        AND category_id = required_parent_id
    ) THEN
      RAISE EXCEPTION
        'Cannot assign category "%" without parent category "%". Location: %',
        NEW.category_id, required_parent_id, NEW.location_uuid;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Trigger function to prevent removing parent when child exists on DELETE
CREATE OR REPLACE FUNCTION enforce_category_hierarchy_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  dependent_child_id TEXT;
BEGIN
  -- Check if any child categories depend on the one being removed
  FOR dependent_child_id IN
    SELECT child_id
    FROM category_hierarchies
    WHERE parent_id = OLD.category_id
  LOOP
    -- Check if this location has the child category
    IF EXISTS (
      SELECT 1
      FROM location_categories
      WHERE location_uuid = OLD.location_uuid
        AND category_id = dependent_child_id
    ) THEN
      RAISE EXCEPTION
        'Cannot remove parent category "%" while child category "%" exists. Location: %',
        OLD.category_id, dependent_child_id, OLD.location_uuid;
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Create triggers on location_categories table
CREATE TRIGGER category_hierarchy_insert_check
  BEFORE INSERT OR UPDATE ON location_categories
  FOR EACH ROW
  EXECUTE FUNCTION enforce_category_hierarchy_on_insert();--> statement-breakpoint

CREATE TRIGGER category_hierarchy_delete_check
  BEFORE DELETE ON location_categories
  FOR EACH ROW
  EXECUTE FUNCTION enforce_category_hierarchy_on_delete();
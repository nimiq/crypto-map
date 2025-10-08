CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "location_categories" (
	"location_uuid" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp,
	CONSTRAINT "location_categories_location_uuid_category_id_pk" PRIMARY KEY("location_uuid","category_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"uuid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"rating" double precision,
	"photo" text,
	"gmaps_place_id" text NOT NULL,
	"gmaps_url" text NOT NULL,
	"website" text,
	"source" varchar(20) NOT NULL,
	"timezone" text NOT NULL,
	"opening_hours" text,
	"updated_at" timestamp,
	"created_at" timestamp,
	CONSTRAINT "locations_gmaps_place_id_unique" UNIQUE("gmaps_place_id")
);
--> statement-breakpoint
ALTER TABLE "location_categories" ADD CONSTRAINT "location_categories_location_uuid_locations_uuid_fk" FOREIGN KEY ("location_uuid") REFERENCES "public"."locations"("uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_categories" ADD CONSTRAINT "location_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_idx" ON "location_categories" USING btree ("location_uuid");--> statement-breakpoint
CREATE INDEX "category_idx" ON "location_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "location_spatial_idx" ON "locations" USING gist ("location");
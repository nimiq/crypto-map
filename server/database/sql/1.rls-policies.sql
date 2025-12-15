-- Row Level Security (RLS) Policies and Triggers
-- Run this after creating tables with Drizzle migrations

-- Create trigger function to validate category hierarchy on insert
CREATE OR REPLACE FUNCTION check_category_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the category exists in category_hierarchies as a child
  IF EXISTS (
    SELECT 1 FROM category_hierarchies 
    WHERE child_id = NEW.category_id
  ) THEN
    -- Verify parent categories are also assigned to this location
    IF NOT EXISTS (
      SELECT 1 FROM category_hierarchies ch
      WHERE ch.child_id = NEW.category_id
      AND EXISTS (
        SELECT 1 FROM location_categories lc
        WHERE lc.location_uuid = NEW.location_uuid
        AND lc.category_id = ch.parent_id
      )
    ) THEN
      RAISE WARNING 'Category % has parent categories that should also be assigned', NEW.category_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on location_categories
DROP TRIGGER IF EXISTS category_hierarchy_insert_check ON location_categories;
CREATE TRIGGER category_hierarchy_insert_check
  BEFORE INSERT ON location_categories
  FOR EACH ROW
  EXECUTE FUNCTION check_category_hierarchy();

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories: Read-only for anon/authenticated, write-only for service_role
DROP POLICY IF EXISTS "Allow read access for all users" ON categories;
CREATE POLICY "Allow read access for all users"
ON categories FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Only service_role can write categories (seed only)" ON categories;
CREATE POLICY "Only service_role can write categories (seed only)"
ON categories FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Block updates on categories" ON categories;
CREATE POLICY "Block updates on categories"
ON categories FOR UPDATE
TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "Block deletes on categories" ON categories;
CREATE POLICY "Block deletes on categories"
ON categories FOR DELETE
TO anon, authenticated
USING (false);

-- Enable RLS on locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Locations: Read for all, write only for service_role (admin)
DROP POLICY IF EXISTS "Allow read access for all users" ON locations;
CREATE POLICY "Allow read access for all users"
ON locations FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Only service_role can insert locations" ON locations;
CREATE POLICY "Only service_role can insert locations"
ON locations FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Only service_role can update locations" ON locations;
CREATE POLICY "Only service_role can update locations"
ON locations FOR UPDATE
TO service_role
USING (true);

DROP POLICY IF EXISTS "Only service_role can delete locations" ON locations;
CREATE POLICY "Only service_role can delete locations"
ON locations FOR DELETE
TO service_role
USING (true);

-- Enable RLS on location_categories table
ALTER TABLE location_categories ENABLE ROW LEVEL SECURITY;

-- Location Categories: Read for all, write only for service_role
DROP POLICY IF EXISTS "Allow read access for all users" ON location_categories;
CREATE POLICY "Allow read access for all users"
ON location_categories FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Only service_role can insert location_categories" ON location_categories;
CREATE POLICY "Only service_role can insert location_categories"
ON location_categories FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Only service_role can update location_categories" ON location_categories;
CREATE POLICY "Only service_role can update location_categories"
ON location_categories FOR UPDATE
TO service_role
USING (true);

DROP POLICY IF EXISTS "Only service_role can delete location_categories" ON location_categories;
CREATE POLICY "Only service_role can delete location_categories"
ON location_categories FOR DELETE
TO service_role
USING (true);

-- Enable RLS on category_hierarchies table
ALTER TABLE category_hierarchies ENABLE ROW LEVEL SECURITY;

-- Category Hierarchies: Read-only for all, write-only for service_role (seed only)
DROP POLICY IF EXISTS "Allow read access for all users" ON category_hierarchies;
CREATE POLICY "Allow read access for all users"
ON category_hierarchies FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Only service_role can write category_hierarchies (seed only)" ON category_hierarchies;
CREATE POLICY "Only service_role can write category_hierarchies (seed only)"
ON category_hierarchies FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Block updates on category_hierarchies" ON category_hierarchies;
CREATE POLICY "Block updates on category_hierarchies"
ON category_hierarchies FOR UPDATE
TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "Block deletes on category_hierarchies" ON category_hierarchies;
CREATE POLICY "Block deletes on category_hierarchies"
ON category_hierarchies FOR DELETE
TO anon, authenticated
USING (false);

-- ================================================
-- SPATIAL_REF_SYS (PostGIS system table)
-- ================================================
-- Public EPSG coordinate system definitions
-- Read-only for app roles, managed by PostGIS extension
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spatial_ref_sys_select_anon" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_select_authenticated" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_select_service_role" ON spatial_ref_sys;

CREATE POLICY "spatial_ref_sys_select_anon" ON spatial_ref_sys FOR SELECT TO anon USING (true);
CREATE POLICY "spatial_ref_sys_select_authenticated" ON spatial_ref_sys FOR SELECT TO authenticated USING (true);
CREATE POLICY "spatial_ref_sys_select_service_role" ON spatial_ref_sys FOR SELECT TO service_role USING (true);

-- Block writes from app roles
DROP POLICY IF EXISTS "spatial_ref_sys_no_insert_anon" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_no_insert_authenticated" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_no_update_anon" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_no_update_authenticated" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_no_delete_anon" ON spatial_ref_sys;
DROP POLICY IF EXISTS "spatial_ref_sys_no_delete_authenticated" ON spatial_ref_sys;

CREATE POLICY "spatial_ref_sys_no_insert_anon" ON spatial_ref_sys FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "spatial_ref_sys_no_insert_authenticated" ON spatial_ref_sys FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "spatial_ref_sys_no_update_anon" ON spatial_ref_sys FOR UPDATE TO anon USING (false);
CREATE POLICY "spatial_ref_sys_no_update_authenticated" ON spatial_ref_sys FOR UPDATE TO authenticated USING (false);
CREATE POLICY "spatial_ref_sys_no_delete_anon" ON spatial_ref_sys FOR DELETE TO anon USING (false);
CREATE POLICY "spatial_ref_sys_no_delete_authenticated" ON spatial_ref_sys FOR DELETE TO authenticated USING (false);

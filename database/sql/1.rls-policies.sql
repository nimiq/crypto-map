-- Row Level Security (RLS) Policies
-- Run this after creating tables with Drizzle migrations

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

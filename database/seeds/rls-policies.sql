-- Row Level Security (RLS) Policies
-- Run this after creating tables with Drizzle migrations

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories: Read-only for anon/authenticated, write-only for service_role
CREATE POLICY "Allow read access for all users"
ON categories FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Only service_role can write categories (seed only)"
ON categories FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Block updates on categories"
ON categories FOR UPDATE
TO anon, authenticated
USING (false);

CREATE POLICY "Block deletes on categories"
ON categories FOR DELETE
TO anon, authenticated
USING (false);

-- Enable RLS on locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Locations: Read for all, write only for service_role (admin)
CREATE POLICY "Allow read access for all users"
ON locations FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Only service_role can insert locations"
ON locations FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service_role can update locations"
ON locations FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Only service_role can delete locations"
ON locations FOR DELETE
TO service_role
USING (true);

-- Enable RLS on location_categories table
ALTER TABLE location_categories ENABLE ROW LEVEL SECURITY;

-- Location Categories: Read for all, write only for service_role
CREATE POLICY "Allow read access for all users"
ON location_categories FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Only service_role can insert location_categories"
ON location_categories FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service_role can update location_categories"
ON location_categories FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Only service_role can delete location_categories"
ON location_categories FOR DELETE
TO service_role
USING (true);

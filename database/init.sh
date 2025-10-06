#!/bin/bash
set -e

echo "Initializing database..."

# Create supabase_admin role first (required by Supabase PostGIS image)
echo "Creating supabase_admin role..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE ROLE supabase_admin WITH SUPERUSER;"

# Enable PostGIS and create other roles
echo "Enabling PostGIS and creating roles..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	-- Enable PostGIS extension
	CREATE EXTENSION IF NOT EXISTS postgis;
	CREATE EXTENSION IF NOT EXISTS postgis_topology;

	-- Create roles for PostgREST
	CREATE ROLE anon NOLOGIN;
	CREATE ROLE authenticated NOLOGIN;
	CREATE ROLE service_role NOLOGIN;
	CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';

	-- Grant privileges
	GRANT anon TO authenticator;
	GRANT authenticated TO authenticator;
	GRANT service_role TO authenticator;

	-- Grant schema permissions
	GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
	GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
	GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

	-- Grant write privileges only to service_role (admin)
	GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

	-- Set default privileges for future tables
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated, service_role;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO service_role;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role;
	ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO anon, authenticated, service_role;
EOSQL

echo "Database initialization complete (extensions and roles only)."

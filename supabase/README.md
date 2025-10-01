# Supabase Studio (Minimal)

PostgreSQL with PostGIS + Supabase Studio dashboard (minimal services, no auth).

## Quick Start

```bash
# Start services
docker compose up -d

# Run database setup and seed (creates tables + seeds data)
cd ..
pnpm run db:seed

# Apply Row Level Security policies
cd supabase
docker exec -i supabase-db psql -U postgres -d postgres < rls-policies.sql
```

**Access:**

- **Supabase Studio**: http://localhost:4000
- **PostgreSQL**: `localhost:5432` or port from your `.env`
- **REST API**: http://localhost:8000/rest/v1/ or port from your `.env`

## Connection

```
postgresql://postgres:HJc0JgmWPmf0dLI9Bo4iQ@localhost:5432/postgres
```

## What's Included

**Services:**

- PostgreSQL 16 with PostGIS 3.4
- Supabase Studio (dashboard)
- PostgREST (auto REST API)
- Kong (API gateway)
- postgres-meta (metadata service)

**Not included:**

- Auth, Storage, Realtime, Functions, Analytics

## Row Level Security (RLS)

The database uses RLS to control access:

**Roles:**

- `anon` - Unauthenticated users (public API)
- `authenticated` - Authenticated users
- `service_role` - Admin role (for admin panel and seeding)

**Access Control:**

- **categories**: Read-only for all users. Only `service_role` can write (seed process only).
- **locations**: Read for all users. Only `service_role` can write (admin panel).
- **location_categories**: Read for all users. Only `service_role` can write (admin panel).

**Setup RLS:**

After creating tables, apply RLS policies:

```bash
cd supabase
docker exec -i supabase-db psql -U postgres -d postgres < rls-policies.sql
```

## Using the Studio

1. Open http://localhost:4000
2. Navigate to Table Editor to create/edit tables
3. Use SQL Editor for custom queries
4. PostGIS functions are available

## PostGIS Examples

```sql
-- Create spatial table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    location GEOMETRY(Point, 4326)
);

-- Create spatial index
CREATE INDEX locations_geom_idx ON locations USING GIST (location);

-- Insert point
INSERT INTO locations (name, location)
VALUES ('Lugano', ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326));

-- Find nearby (10km radius)
SELECT name,
    ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326)::geography
    ) / 1000 AS distance_km
FROM locations
WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(8.9511, 46.0037), 4326)::geography,
    10000
)
ORDER BY distance_km;
```

## REST API

Access your tables via REST API with role-based authentication:

```bash
# Get all locations (public access with anon key)
curl http://localhost:8000/rest/v1/locations \
  -H "apikey: YOUR_ANON_KEY"

# Try to insert location with anon key (will fail due to RLS)
curl -X POST http://localhost:8000/rest/v1/locations \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Location"}'

# Insert location with service_role key (admin access, will succeed)
curl -X POST http://localhost:8000/rest/v1/locations \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Location","address":"Test Address","location":"POINT(8.9511 46.0037)"}'
```

Get your keys from `.env` file:

- `ANON_KEY` - Public access (read-only due to RLS)
- `SERVICE_ROLE_KEY` - Admin access (full read/write access)

## Commands

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose down -v        # Remove all data
docker compose restart studio # Restart Studio
```

## Configuration

Edit `.env` for custom ports and credentials:

```env
POSTGRES_PASSWORD=...
STUDIO_PORT=4000
KONG_HTTP_PORT=8000
```

## Railway Deployment

For Railway, use their managed PostgreSQL + deploy these services:

1. PostgreSQL (Railway managed) - enable PostGIS extension
2. PostgREST, Kong, Meta, Studio as separate services
3. Set environment variables from `.env`

Or use Railway's PostgreSQL only and pgAdmin for management.

# Supabase Development Environment

Local PostgreSQL with PostGIS for development.

## What's in this folder

```
supabase/
├── docker-compose.yml      # Docker setup for PostgreSQL + Supabase Studio
├── init.sh                 # Database initialization script (PostGIS, roles)
├── kong.yml                # API gateway configuration
├── schema.ts               # Drizzle ORM schema (source of truth)
├── migrations/             # Auto-generated SQL migrations from schema.ts
│   ├── 0000_*.sql         # Initial schema
│   └── meta/              # Migration metadata
└── seeds/                  # Database seed data
    ├── categories.sql     # All Google Maps categories
    ├── rls-policies.sql   # Row Level Security policies
    └── sources/           # Location data by source
        └── dummy.sql      # Test location data
```

**Schema workflow:**
1. Edit `schema.ts` (Drizzle schema)
2. Run `pnpm run db:generate` to create migrations
3. Restart Docker to apply migrations automatically

## Quick Start

```bash
# Start PostgreSQL + Supabase Studio
docker compose up -d

# Access Supabase Studio
open http://localhost:4000
```

**Connection string:**
```
postgresql://postgres:HJc0JgmWPmf0dLI9Bo4iQ@localhost:5432/postgres
```

## Services

- **PostgreSQL 16** with PostGIS 3.4 on port `5432`
- **Supabase Studio** on http://localhost:4000
- **PostgREST API** on http://localhost:8000/rest/v1/

## Commands

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose logs -f        # View logs
docker compose down -v        # Remove all data
```

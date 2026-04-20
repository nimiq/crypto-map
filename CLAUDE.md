# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crypto Map Pay App Widget = Nuxt 4 app. Helps users find crypto-friendly locations worldwide. Uses PostgreSQL + PostGIS for geo queries, pgvector for semantic search via OpenAI embeddings. Hybrid search = PostgreSQL FTS + AI category matching. Deployed on NuxtHub/Cloudflare. Styled with UnoCSS + Nimiq design system.

## Development Commands

```bash
# Development
pnpm run dev              # Start dev server on localhost:3000
pnpm run build            # Build for production
pnpm run preview          # Preview production build

# Database (requires .env file in project root)
pnpm run db:setup         # Initialize database with migrations and seeds
pnpm run db:apply-naka    # Apply NAKA location data to database
pnpm run db:generate      # Generate Drizzle migrations from schema changes
pnpm run db:nuke          # Nuclear reset - drops all tables

# Data Sources (in sources/ submodule)
pnpm run sources:fetch    # Fetch locations from NAKA API
pnpm run sources:enrich   # Enrich with Google Places (shows cost estimate!)
pnpm run sources:clean    # Validate and clean data
pnpm run sources:generate # Generate SQL output
pnpm run sources:pipeline # Run full pipeline (fetch → enrich → clean → generate)

# Code Quality
pnpm run lint             # Run ESLint with cache
pnpm run lint:fix         # Auto-fix ESLint issues
pnpm run typecheck        # Run TypeScript type checking
```

## Architecture

### Data Sources (Git Submodule)

Location data lives in **private Git submodule** at `sources/` (repo: `nimiq/crypto-map-sources`). Separates sensitive API responses from public main repo.

**Structure:**

```
sources/
├── naka/
│   ├── docs/               # NAKA API documentation (PDF)
│   ├── raw/
│   │   └── google-places-cache.json  # Cached API responses
│   ├── scripts/
│   │   ├── 1-fetch-naka.ts           # Fetch from NAKA API
│   │   ├── 2-enrich-with-google.ts   # Google Places enrichment (paid!)
│   │   ├── 3-clean-data.ts           # Validation and cleaning
│   │   └── 4-generate-sql.ts         # Generate SQL output
│   └── output/
│       └── naka.sql                  # Generated SQL
└── .env                    # API keys (NAKA_API_KEY, GOOGLE_API_KEY)
```

**Data Pipeline:**

1. **Fetch** - Get merchant list from NAKA API (`api.gocrypto.com/v2/stores`)
2. **Enrich** - Use `place_id` to fetch correct business data from Google Places API
   - ⚠️ **IMPORTANT**: NAKA coords geocoded from address, not real business location
   - Google Places API costs ~$0.017/request - script shows cost estimate, prompts confirmation
3. **Clean** - Normalize names, map categories
4. **Generate** - Create SQL INSERT statements for DB import

**Output:** `sources/naka/output/naka.sql` (read directly by `db:apply-naka` script)

### Image Proxying System

Location photos proxied through `/blob/location/{uuid}` to cut Google Maps API costs + boost perf:

1. **Cache Check** - NuxtHub Blob storage checked first
2. **Database Lookup** - Fetch `photo` URL and `gmapsPlaceId` from locations table
3. **External Fetch** - Try direct photo URL first (if available)
4. **Google Maps Fallback** - Use Places API with `gmapsPlaceId` to fetch photo_reference, then fetch photo (800px max width)
5. **Validation** - Images must be valid (1KB+ size, MIME type starting `image/`)
6. **Background Caching** - Store in Blob with correct content type via `event.waitUntil()` (fire-and-forget)
7. **Serve** - Return image with `Cache-Control: public, max-age=31536000, immutable`

Invalid cached images (< 1KB) auto-deleted + refetched. Frontend uses this via `NuxtImg` component with `cloudflareOnProd` provider (Cloudflare Image Resizing in prod, no transform in dev).

### Database Architecture

App uses **PostgreSQL + PostGIS + pgvector**. Normalized schema, four tables:

1. **`categories`** - All unique Google Maps category types with vector embeddings
   - Schema: `id` (text, PK), `name` (text), `icon` (text), `embedding` (vector(1536)), `createdAt` (timestamp)
   - **Vector embeddings** = semantic search - "coffee shop" matches "cafe" without exact text match
   - Embeddings generated via OpenAI text-embedding-3-small (1536 dimensions)
   - Seeded from `database/seeds/categories.sql`

2. **`locations`** - Main location data with PostGIS geometry + opening hours
   - Primary key: auto-generated UUID
   - **Uses PostGIS `geometry(point, 4326)` for location** instead of separate lat/lng columns
   - GIST spatial index on `location` column for fast proximity queries
   - Schema: `uuid`, `name`, `street`, `city`, `postalCode`, `region`, `country`, `location` (geometry point), `rating`, `ratingCount`, `photo`, `gmapsPlaceId` (unique), `gmapsUrl`, `website`, `source`, `timezone`, `openingHours`, `createdAt`, `updatedAt`
   - Address split into structured fields: `street`, `city`, `postalCode`, `region`, `country`
   - `timezone`: IANA timezone identifier (e.g., "Europe/Zurich")
   - `openingHours`: JSON string with weekly hours
   - Extract coords via `ST_X(location)` for lng, `ST_Y(location)` for lat

3. **`location_categories`** - Junction table for many-to-many
   - Links locations to categories via FKs with cascade delete
   - Composite PK on (locationUuid, categoryId)
   - Indexed on both FKs for fast joins

4. **`category_hierarchies`** - Category parent-child relationships
   - Schema: `childId` (text, FK), `parentId` (text, FK), `createdAt` (timestamp)
   - Enables hierarchical category organization (e.g., "italian_restaurant" → "restaurant")
   - Composite PK on (childId, parentId)
   - Indexed on both childId + parentId for fast traversal

**Important**: When adding locations:

1. Insert into `locations` with location as `{x: longitude, y: latitude}`
2. Insert rows into `location_categories` junction table
3. PostGIS handles geometry conversion

### Database Seeding

- **Setup**: Run `pnpm run db:setup` to init DB with migrations + seeds
- Migrations live in `server/database/migrations/` (generated by Drizzle)
- Seed SQL files in `server/database/sql/`:
  - `1.rls-policies.sql` - Row Level Security policies + triggers
  - `2.category-hierarchies.sql` - Category parent-child relationships
- Location data read directly from `sources/naka/output/naka.sql` by `db:apply-naka`
- Categories with embeddings seeded from `server/database/scripts/categories.json`
- Apply updated location data: `pnpm run db:apply-naka`
- Regenerate migrations after schema changes: `pnpm run db:generate`

### Search System

App does **hybrid search**, two approaches:

1. **Text Search** - PostgreSQL Full-Text Search (FTS)
   - Uses `to_tsvector` and `to_tsquery` for fast text matching
   - Searches location name + address fields
   - `ts_headline` generates highlighted snippets with `<mark>` tags
   - Used in autocomplete for instant results (10-50ms)

2. **Semantic Search** - Vector similarity via pgvector
   - Query → OpenAI embedding → Find similar category embeddings
   - Cosine similarity with threshold 0.7 (configurable in `server/utils/search.ts`)
   - Returns top 5 matching categories
   - Then fetches locations in those categories

3. **Embedding Cache** - NuxtHub KV
   - Permanent cache (no TTL) for query embeddings
   - Cuts OpenAI API costs + latency
   - Autocomplete precomputes embeddings in background
   - Cache key: `embedding:${query.trim().toLowerCase()}`

### API Endpoints

**`GET /api/categories`**

- Returns all categories from DB
- Populates filter UI
- Returns: `Array<{id, name, icon}>`

**`GET /api/locations/[uuid]`**

- Fetch single location by UUID
- Path param: `uuid` (validated as UUID)
- Uses `json_agg` with `json_build_object` to aggregate categories as JSON array
- Returns: Full location object with `categories: Array<{id, name, icon}>`

**`GET /api/search`**

- Hybrid search = text FTS + semantic category matching
- Query params:
  - `q` (required): Search query string
  - `lat`/`lng` (optional): User location for future distance sorting (currently logged only)
  - `categories` (optional): Array of category IDs to filter by
  - `openNow` (optional): Boolean to filter by opening hours
- If lat/lng missing, falls back to Cloudflare IP geolocation via `locateByHost()`
- Returns empty array if query empty
- **Search flow:**
  1. Parallel: `searchLocationsByText()` + `searchSimilarCategories()`
  2. Fetch locations matching similar categories via `searchLocationsByCategories()`
  3. Merge results (text first, then semantic), dedupe by UUID
  4. Apply category filters if provided (all selected categories must match)
  5. Apply opening hours filter if `openNow=true`
- Uses PostgreSQL `STRING_AGG()` for comma-separated category IDs
- Extracts lat/lng from PostGIS geometry via `ST_Y()` and `ST_X()`
- Returns: `Array<SearchLocationResponse>` with `categoryIds` string + `categories` array

**`GET /api/search/autocomplete`**

- Fast text-only search for autocomplete dropdown
- Query params: `q` (required, min 2 chars)
- **Background task**: Calls `generateEmbeddingCached()` fire-and-forget to precompute embedding
- Uses `searchLocationsByText()` with PostgreSQL FTS
- Returns: Same as search endpoint + `highlightedName` field with `<mark>` tags

### Performance & Caching

**Route Rules** (in `nuxt.config.ts`):

- `/api/categories`: 1h browser cache + 12h stale-while-revalidate (low variance, recalc counts)
- `/api/locations/*` (single location): 15min cache + 15min SWR (hot path)
- `/api/locations` (list): No caching (high variance from filters + open/closed state)
- All other routes = default caching

**Embedding Cache**: NuxtHub KV, permanent storage (no TTL) for OpenAI embeddings, keyed by normalized query text.

**Image Caching**: NuxtHub Blob storage, immutable cache headers (1 year), auto-refetch on invalid images.

### Internationalization

App supports 5 languages via `@nuxtjs/i18n`:

- English (en) - default
- Español (es)
- Deutsch (de)
- Français (fr)
- Português (pt)

Translation files in `locales/` directory as JSON. Module configured with `defaultLocale: 'en'` + `langDir: 'locales'`.

### Styling System

App uses **UnoCSS + Nimiq presets**:

- `presetOnmax()` - Base utilities
- `presetNimiq()` - Nimiq design system utilities + attributify mode
- Utilities applied via **attributify syntax** directly on elements (e.g., `flex="~ col gap-16"`)
- Nimiq CSS provides `f-` prefix utilities for consistent spacing/typography
- Custom utility examples: `f-mb-lg`, `f-py-xl`, `f-px-md`, `text="neutral-900 f-lg"`
- Use `size-X` instead of `w-X h-X` for squares (UnoCSS/TailwindCSS best practice)

### UI Components

- **Reka UI** for accessible components (Vue port of Radix UI)
- Auto-imported via `reka-ui/nuxt` module in nuxt.config.ts
- Example: `ToggleGroupRoot` + `ToggleGroupItem` for category filters
- Must use `Root` component (e.g., `ToggleGroupRoot`, not `ToggleGroup`)
- **Note**: With attributify mode on `NuxtLink` or `a` tags, prefix text utilities with `un-` (e.g., `un-text="neutral-800"`) due to HTML attr conflicts

### Type Safety

- **Valibot** for runtime validation (not Zod)
- Query params validated in API routes via `v.safeParse()`
- Example pattern: `v.pipe(v.string(), v.transform(Number), v.number())`
- Runtime config validation via `nuxt-safe-runtime-config` with Valibot schema

### Database Access

- Use `useDrizzle()` helper for DB instance
- Import schema as `tables` from `server/utils/drizzle.ts`
- Schema in `database/schema.ts`
- Type exports: `Location`, `Category`, `LocationCategory`
- Connection uses `DATABASE_URL` from runtime config (Supabase PostgreSQL connection string)
- PostgreSQL-specific: Use `sql` tagged templates for PostGIS + pgvector queries
- PostGIS functions: `ST_X()`, `ST_Y()`, `ST_Distance()`, `ST_Within()`, etc.
- pgvector operators: `<=>` (cosine distance), `<->` (L2 distance), `<#>` (inner product)

### Server Utilities

- **`server/utils/search.ts`** - Search functions
  - `searchLocationsByText(query)` - PostgreSQL FTS with `ts_headline` highlighting
  - `searchSimilarCategories(query)` - Vector similarity search for categories
  - `searchLocationsByCategories(categoryIds)` - Fetch locations by category IDs
  - `locationSelect` - Reusable select object, avoids duplicating 20+ column definitions
  - `SIMILARITY_THRESHOLD` constant (0.7) - Tune for more/fewer semantic results

- **`server/utils/embeddings.ts`** - OpenAI embedding generation
  - `generateEmbeddingCached(text)` - Generate or fetch cached embedding from NuxtHub KV
  - Model: `text-embedding-3-small` (1536 dimensions)
  - Cache key format: `embedding:${text.trim().toLowerCase()}`

- **`server/utils/open-now.ts`** - Opening hours filtering
  - `filterOpenNow(locations)` - Filter locations by current opening hours
  - Handles timezone conversion via location's `timezone` field
  - Parses `openingHours` JSON string

- **`server/utils/geoip.ts`** - GeoIP location service
  - `locateByHost(ip)` - Cloudflare IP geolocation fallback

- **`server/utils/drizzle.ts`** - DB utilities
  - `useDrizzle()` - Get DB instance
  - `tables` export - All table schemas

## Key Patterns

### Adding New Locations

**Via NAKA Pipeline (recommended):**

1. Run `pnpm run sources:pipeline` to refresh data from NAKA API
2. Pipeline does fetch → enrich → clean → generate SQL automatically
3. Run `pnpm run db:apply-naka` to apply to DB

**Manually:**

1. Add location to `sources/naka/raw/google-places-cache.json`
2. Run `pnpm run sources:clean && pnpm run sources:generate`
3. Run `pnpm run db:apply-naka` to apply to DB
4. Categories must be valid Google Maps types (snake_case strings)
5. Use PostGIS `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` for location geometry

### Adding New Categories

1. Add to `database/seeds/categories.sql` with format: `INSERT INTO categories (id, name, icon, embedding) VALUES (...)`
2. Generate embedding via OpenAI text-embedding-3-small (1536-dim)
3. Store embedding as vector: `'[0.123, -0.456, ...]'::vector(1536)`
4. Category IDs use snake_case (e.g., "coffee_shop", "restaurant")
5. Restart DB to apply: `pnpm run db:restart`

### Semantic Search Configuration

- **Similarity threshold**: Tune `SIMILARITY_THRESHOLD` in `server/utils/search.ts` (default: 0.7)
  - Higher (0.8+): More precise, fewer results
  - Lower (0.6-): More results, may include less relevant categories
- **Top categories limit**: Returns top 5 similar categories (hardcoded in query `.limit(5)`)
- **Embedding model**: Changing model requires regenerating all category embeddings

### Category Filtering

- Categories use raw Google Maps types (e.g., "restaurant", "cafe", "lodging")
- UI shows formatted names (underscores → spaces, title case)
- Backend stores raw snake_case IDs
- Filter logic: all selected categories must match (AND, not OR)

### Opening Hours Filtering

- `openNow` filter uses `server/utils/open-now.ts`
- Requires valid `timezone` + `openingHours` fields on locations
- Converts current time to location's timezone before checking hours
- Locations without opening hours data excluded when filter active

### Geolocation

- Cloudflare provides `cf-connecting-ip` header in prod
- Dev env requires manual lat/lng query params
- Currently location retrieved but NOT used for distance sorting
- Future: Use `ST_Distance()` for proximity-based sorting

### Custom Providers

**Image Provider** (`app/providers/cloudflareOnProd.ts`):

- Uses Cloudflare Image Resizing in prod only
- In dev, uses `none` provider (no transform)
- Configured in `nuxt.config.ts` as `cloudflareOnProd` provider

## Configuration Files

- **`nuxt.config.ts`** - Nuxt config: NuxtHub, UnoCSS, Reka UI, i18n modules, route rules, runtime config validation
- **`drizzle.config.ts`** - PostgreSQL dialect, schema at `server/database/schema.ts`, migrations output
- **`uno.config.ts`** - UnoCSS with Nimiq presets
- **`eslint.config.mjs`** - Antfu's ESLint config + Nuxt integration
- **`server/database/schema.ts`** - Drizzle schema with custom vector type + HNSW index for pgvector
- **`server/database/scripts/db-setup.ts`** - DB setup script (migrations + seeding)
- **`server/database/scripts/categories.json`** - 301 Google Maps categories with pre-generated 1536-dim embeddings
- **`sources/`** - Git submodule with data processing pipeline (see Data Sources section)

## Environment Variables

**Main repo** (`.env` in project root):

```env
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-[region].pooler.supabase.com:5432/postgres  # Supabase PostgreSQL session pooler
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key  # Required for semantic search embeddings
```

**Data sources submodule** (`sources/.env`):

```env
NAKA_API_KEY=your_naka_api_key      # For fetching merchant list
GOOGLE_API_KEY=your_google_api_key  # For Places API enrichment (~$0.017/request)
```

All vars validated via `safeRuntimeConfig` using Valibot schema.

**Note**: Without `OPENAI_API_KEY`, semantic search fails. Text search still works.
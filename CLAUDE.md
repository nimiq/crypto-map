# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crypto Map Pay App Widget is a Nuxt 4 application that helps users discover crypto-friendly locations in Lugano. It uses PostgreSQL with PostGIS for geospatial queries and pgvector for semantic search via OpenAI embeddings. The app features hybrid search combining PostgreSQL full-text search with AI-powered category matching. Deployed on NuxtHub/Cloudflare and styled with UnoCSS using the Nimiq design system.

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

Location data is managed in a **private Git submodule** at `sources/` (repo: `nimiq/crypto-map-sources`). This separates sensitive API responses from the public main repo.

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
│       └── naka.sql                  # Generated SQL (symlinked)
└── .env                    # API keys (NAKA_API_KEY, GOOGLE_API_KEY)
```

**Data Pipeline:**
1. **Fetch** - Get merchant list from NAKA API (`api.gocrypto.com/v2/stores`)
2. **Enrich** - Use `place_id` to fetch correct business data from Google Places API
   - ⚠️ **IMPORTANT**: NAKA coordinates are geocoded from address, not actual business location
   - Google Places API costs ~$0.017/request - script shows cost estimate and prompts for confirmation
3. **Clean** - Validate bounds (Lugano region), normalize names, map categories
4. **Generate** - Create SQL INSERT statements for database import

**Output:** `sources/naka/output/naka.sql` is symlinked to `server/database/sql/3.naka.sql`

### Image Proxying System

Location photos are proxied through `/blob/location/{uuid}` to reduce Google Maps API costs and improve performance:

1. **Cache Check** - NuxtHub Blob storage checked first
2. **Database Lookup** - Fetch `photo` URL and `gmapsPlaceId` from locations table
3. **External Fetch** - Try direct photo URL first (if available)
4. **Google Maps Fallback** - Use Places API with `gmapsPlaceId` to fetch photo_reference, then fetch actual photo (800px max width)
5. **Validation** - Images must be valid (1KB+ size, proper MIME type starting with `image/`)
6. **Background Caching** - Store in Blob with correct content type using `event.waitUntil()` (fire-and-forget)
7. **Serve** - Return image with `Cache-Control: public, max-age=31536000, immutable`

Invalid cached images (< 1KB) are automatically deleted and refetched. Frontend uses this via `NuxtImg` component with `cloudflareOnProd` provider (Cloudflare Image Resizing in production, no transformation in dev).

### Database Architecture

The app uses **PostgreSQL with PostGIS and pgvector** and a normalized relational schema with four tables:

1. **`categories`** - Stores all unique Google Maps category types with vector embeddings
   - Schema: `id` (text, PK), `name` (text), `icon` (text), `embedding` (vector(1536)), `createdAt` (timestamp)
   - **Vector embeddings** enable semantic search - "coffee shop" matches "cafe" without exact text match
   - Embeddings are generated via OpenAI text-embedding-3-small (1536 dimensions)
   - Categories are seeded from `database/seeds/categories.sql`

2. **`locations`** - Main location data with PostGIS geometry and opening hours
   - Primary key: auto-generated UUID
   - **Uses PostGIS `geometry(point, 4326)` for location** instead of separate lat/lng columns
   - GIST spatial index on `location` column for efficient proximity queries
   - Schema: `uuid`, `name`, `street`, `city`, `postalCode`, `region`, `country`, `location` (geometry point), `rating`, `ratingCount`, `photo`, `gmapsPlaceId` (unique), `gmapsUrl`, `website`, `source`, `timezone`, `openingHours`, `createdAt`, `updatedAt`
   - Address broken into structured fields: `street`, `city`, `postalCode`, `region`, `country`
   - `timezone`: IANA timezone identifier (e.g., "Europe/Zurich")
   - `openingHours`: JSON string with weekly opening hours
   - Extract coordinates using `ST_X(location)` for longitude and `ST_Y(location)` for latitude

3. **`location_categories`** - Junction table for many-to-many relationship
   - Links locations to categories via foreign keys with cascade delete
   - Composite primary key on (locationUuid, categoryId)
   - Indexed on both foreign keys for efficient joins

4. **`category_hierarchies`** - Category parent-child relationships
   - Schema: `childId` (text, FK), `parentId` (text, FK), `createdAt` (timestamp)
   - Enables hierarchical category organization (e.g., "italian_restaurant" → "restaurant")
   - Composite primary key on (childId, parentId)
   - Indexed on both childId and parentId for efficient traversal

**Important**: When adding locations:

1. Insert into `locations` table with location as `{x: longitude, y: latitude}`
2. Insert corresponding rows into `location_categories` junction table
3. PostGIS automatically handles the geometry conversion

### Database Seeding

- **Setup**: Run `pnpm run db:setup` to initialize database with migrations and seeds
- Migrations are stored in `server/database/migrations/` (generated by Drizzle)
- Seed SQL files in `server/database/sql/`:
  - `1.rls-policies.sql` - Row Level Security policies and triggers
  - `2.category-hierarchies.sql` - Category parent-child relationships
  - `3.naka.sql` - Location data (symlink to `sources/naka/output/naka.sql`)
- Categories with embeddings are seeded from `server/database/scripts/categories.json`
- To apply updated location data: `pnpm run db:apply-naka`
- To regenerate migrations after schema changes: `pnpm run db:generate`

### Search System

The app implements **hybrid search** combining two approaches:

1. **Text Search** - PostgreSQL Full-Text Search (FTS)
   - Uses `to_tsvector` and `to_tsquery` for fast text matching
   - Searches across location name and address fields
   - `ts_headline` generates highlighted snippets with `<mark>` tags
   - Used in autocomplete for instant results (10-50ms)

2. **Semantic Search** - Vector similarity via pgvector
   - Query → OpenAI embedding → Find similar category embeddings
   - Uses cosine similarity with threshold 0.7 (configurable in `server/utils/search.ts`)
   - Returns top 5 matching categories
   - Then fetches locations belonging to those categories

3. **Embedding Cache** - NuxtHub KV
   - Permanent cache (no TTL) for query embeddings
   - Reduces OpenAI API costs and latency
   - Autocomplete precomputes embeddings in background
   - Cache key: `embedding:${query.trim().toLowerCase()}`

### API Endpoints

**`GET /api/categories`**

- Returns all categories from the database
- Used to populate filter UI
- Returns: `Array<{id, name, icon}>`

**`GET /api/locations/[uuid]`**

- Fetch single location by UUID
- Path parameter: `uuid` (validated as UUID)
- Uses `json_agg` with `json_build_object` to aggregate categories as JSON array
- Returns: Full location object with `categories: Array<{id, name, icon}>`

**`GET /api/search`**

- Hybrid search combining text FTS and semantic category matching
- Query params:
  - `q` (required): Search query string
  - `lat`/`lng` (optional): User location for future distance sorting (currently logged only)
  - `categories` (optional): Array of category IDs to filter by
  - `openNow` (optional): Boolean to filter by opening hours
- If lat/lng not provided, attempts Cloudflare IP geolocation via `locateByHost()`
- Returns empty array if query is empty
- **Search flow:**
  1. Parallel: `searchLocationsByText()` + `searchSimilarCategories()`
  2. Fetch locations matching similar categories via `searchLocationsByCategories()`
  3. Merge results (text first, then semantic) and deduplicate by UUID
  4. Apply category filters if provided (all selected categories must match)
  5. Apply opening hours filter if `openNow=true`
- Uses PostgreSQL `STRING_AGG()` for comma-separated category IDs
- Extracts lat/lng from PostGIS geometry using `ST_Y()` and `ST_X()`
- Returns: `Array<SearchLocationResponse>` with `categoryIds` string and `categories` array

**`GET /api/search/autocomplete`**

- Fast text-only search for autocomplete dropdown
- Query params: `q` (required, min 2 chars)
- **Background task**: Calls `generateEmbeddingCached()` in fire-and-forget mode to precompute embedding
- Uses `searchLocationsByText()` with PostgreSQL FTS
- Returns: Same as search endpoint but includes `highlightedName` field with `<mark>` tags

### Performance & Caching

**Route Rules** (defined in `nuxt.config.ts`):

- `/api/categories`: 1h browser cache + 12h stale-while-revalidate (low variance, recalculated counts)
- `/api/locations/*` (single location): 15min cache + 15min SWR (frequently accessed)
- `/api/locations` (list): No caching (high variance due to filters and open/closed state)
- All other routes follow default caching behavior

**Embedding Cache**: NuxtHub KV with permanent storage (no TTL) for OpenAI embeddings, keyed by normalized query text.

**Image Caching**: NuxtHub Blob storage with immutable cache headers (1 year), auto-refetch on invalid images.

### Internationalization

The app supports 5 languages via `@nuxtjs/i18n`:

- English (en) - default
- Español (es)
- Deutsch (de)
- Français (fr)
- Português (pt)

Translation files are stored in `locales/` directory as JSON files. The module is configured with `defaultLocale: 'en'` and `langDir: 'locales'`.

### Styling System

The app uses **UnoCSS with Nimiq presets**:

- `presetOnmax()` - Base utilities
- `presetNimiq()` - Nimiq design system utilities and attributify mode
- Utilities are applied via **attributify syntax** directly on elements (e.g., `flex="~ col gap-16"`)
- Nimiq CSS provides the `f-` prefix utilities for consistent spacing/typography
- Custom utility examples: `f-mb-lg`, `f-py-xl`, `f-px-md`, `text="neutral-900 f-lg"`
- Use `size-X` instead of `w-X h-X` for squares (per UnoCSS/TailwindCSS best practices)

### UI Components

- **Reka UI** is used for accessible components (Vue port of Radix UI)
- Auto-imported via `reka-ui/nuxt` module in nuxt.config.ts
- Example: `ToggleGroupRoot` + `ToggleGroupItem` for category filters
- Must use the `Root` component (e.g., `ToggleGroupRoot`, not `ToggleGroup`)
- **Note**: When using attributify mode with `NuxtLink` or `a` tags, prefix text utilities with `un-` (e.g., `un-text="neutral-800"`) due to HTML attribute conflicts

### Type Safety

- **Valibot** is used for runtime validation (not Zod)
- Query parameters are validated in API routes using `v.safeParse()`
- Example pattern: `v.pipe(v.string(), v.transform(Number), v.number())`
- Runtime config validation via `nuxt-safe-runtime-config` with Valibot schema

### Database Access

- Use `useDrizzle()` helper to get database instance
- Import schema as `tables` from `server/utils/drizzle.ts`
- Schema is defined in `database/schema.ts`
- Type exports: `Location`, `Category`, `LocationCategory`
- Connection uses `DATABASE_URL` from runtime config (Supabase PostgreSQL connection string)
- PostgreSQL-specific: Use `sql` tagged templates for PostGIS and pgvector queries
- PostGIS functions: `ST_X()`, `ST_Y()`, `ST_Distance()`, `ST_Within()`, etc.
- pgvector operators: `<=>` (cosine distance), `<->` (L2 distance), `<#>` (inner product)

### Server Utilities

- **`server/utils/search.ts`** - Search functions
  - `searchLocationsByText(query)` - PostgreSQL FTS with `ts_headline` highlighting
  - `searchSimilarCategories(query)` - Vector similarity search for categories
  - `searchLocationsByCategories(categoryIds)` - Fetch locations by category IDs
  - `locationSelect` - Reusable select object to avoid duplicating 20+ column definitions
  - `SIMILARITY_THRESHOLD` constant (0.7) - Adjust for more/fewer semantic results

- **`server/utils/embeddings.ts`** - OpenAI embedding generation
  - `generateEmbeddingCached(text)` - Generate or fetch cached embedding from NuxtHub KV
  - Model: `text-embedding-3-small` (1536 dimensions)
  - Cache key format: `embedding:${text.trim().toLowerCase()}`

- **`server/utils/open-now.ts`** - Opening hours filtering
  - `filterOpenNow(locations)` - Filter locations by current opening hours
  - Handles timezone conversion using location's `timezone` field
  - Parses `openingHours` JSON string

- **`server/utils/geoip.ts`** - GeoIP location service
  - `locateByHost(ip)` - Cloudflare IP geolocation fallback

- **`server/utils/drizzle.ts`** - Database utilities
  - `useDrizzle()` - Get database instance
  - `tables` export - All table schemas

## Key Patterns

### Adding New Locations

**Via NAKA Pipeline (recommended):**
1. Run `pnpm run sources:pipeline` to refresh data from NAKA API
2. The pipeline fetches → enriches → cleans → generates SQL automatically
3. Run `pnpm run db:apply-naka` to apply to database

**Manually:**
1. Add location to `sources/naka/raw/google-places-cache.json`
2. Run `pnpm run sources:clean && pnpm run sources:generate`
3. Run `pnpm run db:apply-naka` to apply to database
4. Categories must be valid Google Maps types (snake_case strings)
5. Use PostGIS `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` for location geometry

### Adding New Categories

1. Add to `database/seeds/categories.sql` with format: `INSERT INTO categories (id, name, icon, embedding) VALUES (...)`
2. Generate embedding using OpenAI text-embedding-3-small (1536-dim)
3. Store embedding as vector: `'[0.123, -0.456, ...]'::vector(1536)`
4. Category IDs use snake_case (e.g., "coffee_shop", "restaurant")
5. Restart database to apply: `pnpm run db:restart`

### Semantic Search Configuration

- **Similarity threshold**: Adjust `SIMILARITY_THRESHOLD` in `server/utils/search.ts` (default: 0.7)
  - Higher (0.8+): More precise matches, fewer results
  - Lower (0.6-): More results, may include less relevant categories
- **Top categories limit**: Currently returns top 5 similar categories (hardcoded in query `.limit(5)`)
- **Embedding model**: Changing model requires regenerating all category embeddings

### Category Filtering

- Categories use raw Google Maps types (e.g., "restaurant", "cafe", "lodging")
- UI displays formatted category names (underscores → spaces, title case)
- Backend stores raw snake_case IDs
- Filter logic: All selected categories must match (AND logic, not OR)

### Opening Hours Filtering

- `openNow` filter uses `server/utils/open-now.ts`
- Requires valid `timezone` and `openingHours` fields on locations
- Converts current time to location's timezone before checking hours
- Locations without opening hours data are excluded when filter is active

### Geolocation

- Cloudflare provides `cf-connecting-ip` header in production
- Dev environment requires manual lat/lng query params
- Currently location is retrieved but NOT used for distance sorting
- Future: Use `ST_Distance()` for proximity-based sorting

### Custom Providers

**Image Provider** (`app/providers/cloudflareOnProd.ts`):

- Conditionally uses Cloudflare Image Resizing in production only
- In development, uses `none` provider (no transformation)
- Configured in `nuxt.config.ts` as `cloudflareOnProd` provider

## Configuration Files

- **`nuxt.config.ts`** - Nuxt config with NuxtHub, UnoCSS, Reka UI, i18n modules, route rules, runtime config validation
- **`drizzle.config.ts`** - PostgreSQL dialect, schema at `server/database/schema.ts`, migrations output
- **`uno.config.ts`** - UnoCSS with Nimiq presets
- **`eslint.config.mjs`** - Antfu's ESLint config with Nuxt integration
- **`server/database/schema.ts`** - Drizzle schema with custom vector type and HNSW index for pgvector
- **`server/database/scripts/db-setup.ts`** - Database setup script (migrations + seeding)
- **`server/database/scripts/categories.json`** - 301 Google Maps categories with pre-generated 1536-dim embeddings
- **`sources/`** - Git submodule with data processing pipeline (see Data Sources section)

## Environment Variables

**Main repo** (`.env` in project root):

```env
DATABASE_URL=postgresql://postgres.xxxxx:password@...  # Supabase PostgreSQL
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key  # Required for semantic search embeddings
```

**Data sources submodule** (`sources/.env`):

```env
NAKA_API_KEY=your_naka_api_key      # For fetching merchant list
GOOGLE_API_KEY=your_google_api_key  # For Places API enrichment (~$0.017/request)
```

All variables are validated via `safeRuntimeConfig` using Valibot schema.

**Note**: Without `OPENAI_API_KEY`, semantic search will fail. Text search will still work.

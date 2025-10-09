# Pay App - Crypto Payment Locations Map

A Nuxt 4 application for discovering locations that accept cryptocurrency payments in Lugano.

## Features

- 🗺️ Browse crypto-friendly locations with images and details
- 🔍 Hybrid search combining PostgreSQL FTS + semantic embeddings
- ⚡ Fast autocomplete with text search and background embedding precomputation
- 🎯 Category-based filtering and opening hours filtering
- 📍 Optional location-based search with Cloudflare IP geolocation
- 💾 PostgreSQL with PostGIS + pgvector for geospatial and semantic queries
- 🤖 OpenAI embeddings for intelligent category matching
- 🎨 UnoCSS with Nimiq design system (attributify mode)
- 🧩 Accessible UI with Reka UI components
- 🚀 Deployed on NuxtHub/Cloudflare
- 🖼️ Image proxying through NuxtHub Blob cache

## Tech Stack

- **Framework**: Nuxt 4
- **Database**: PostgreSQL with PostGIS and pgvector extensions
- **ORM**: Drizzle ORM
- **AI**: OpenAI text-embedding-3-small for semantic search
- **Cache**: NuxtHub KV for embedding storage
- **Styling**: UnoCSS with `nimiq-css` and `unocss-preset-onmax`
- **UI Components**: Reka UI
- **Validation**: Valibot
- **Deployment**: NuxtHub/Cloudflare

## Installation

First, [install pnpm](https://pnpm.io/installation) if you haven't already.

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and API keys

# Set up database (run migrations and seed data)
DATABASE_URL="your_supabase_url" pnpm run db:setup
```

## Development

```bash
# Start development server
pnpm run dev
```

The app will be available at `http://localhost:3000`

**Note:** Make sure your `DATABASE_URL` in `.env` points to a valid Supabase PostgreSQL instance with PostGIS and pgvector extensions enabled.

## Image Proxying

Location photos are automatically cached using NuxtHub Blob storage to reduce Google Maps API costs:

- Frontend renders images via `/images/location/{uuid}`
- First request fetches from Google Maps API or external URL (auto-detects content type)
- Image is cached in NuxtHub Blob storage with correct MIME type
- Subsequent requests serve from cache

## Project Structure

```
pay-app/
├── app/
│   ├── app.vue              # Root component
│   └── pages/
│       └── index.vue        # Main locations page with search
├── server/
│   ├── api/
│   │   ├── categories.get.ts           # Get all categories
│   │   ├── locations/
│   │   │   └── [uuid].get.ts          # Get single location by UUID
│   │   └── search/
│   │       ├── index.get.ts           # Hybrid search (text + semantic)
│   │       └── autocomplete.get.ts    # Fast text-only autocomplete
│   └── utils/
│       ├── drizzle.ts       # Database utilities and types
│       ├── geoip.ts         # GeoIP location service
│       ├── embeddings.ts    # OpenAI embedding generation with cache
│       ├── search.ts        # Search utilities (text, semantic, categories)
│       └── open-now.ts      # Opening hours filtering
├── shared/
│   └── types/
│       └── index.ts         # Shared TypeScript types
├── database/
│   ├── schema.ts            # Drizzle schema (3 tables, PostGIS + pgvector)
│   ├── migrations/          # Drizzle migrations (auto-generated)
│   ├── scripts/
│   │   ├── db-setup.ts      # Database setup (migrations + seeding)
│   │   ├── reset-db.ts      # Drop all tables
│   │   ├── generate-category-embeddings.ts  # Generate embeddings
│   │   └── categories.json  # 301 Google Maps categories with embeddings
│   └── sql/
│       ├── 1.rls-policies.sql  # Row Level Security policies
│       └── 2.locations.sql     # Dummy location data
├── nuxt.config.ts           # Nuxt configuration
├── uno.config.ts            # UnoCSS configuration
├── drizzle.config.ts        # Drizzle ORM configuration
└── CLAUDE.md                # AI development guidance
```

## Search Flow

Hybrid search combining PostgreSQL full-text search with semantic category matching via vector embeddings.

```mermaid
flowchart TB
    User[User Types Query] --> AC[Autocomplete: PostgreSQL FTS]
    AC --> ACResults[Results with Highlighting]
    AC -.Background.-> Cache[Cache Embedding in KV]

    ACResults --> Action{User Action}

    Action -->|Click Location| Single[GET /api/locations/uuid]
    Action -->|Submit Search| Hybrid[Hybrid Search]

    Hybrid --> Text[Text Search: PostgreSQL FTS]
    Hybrid --> Semantic[Semantic Search: pgvector]

    Semantic --> Embed[Get Cached Embedding]
    Embed --> Similar[Find Similar Categories]
    Similar --> CatLocs[Get Locations by Category]

    Text --> Merge[Merge & Deduplicate]
    CatLocs --> Merge

    Merge --> Filters[Apply Filters]
    Filters --> Results[Final Results]
```

**Key Points:**

- **Autocomplete**: PostgreSQL FTS only (fast, 10-50ms) + background embedding precomputation
- **Hybrid Search**: FTS + vector embeddings for comprehensive results
- **Embedding Cache**: NuxtHub KV with permanent storage (no TTL)
- **Text Search**: `to_tsvector` + `to_tsquery` with `ts_headline` highlighting on name and address
- **Semantic Search**: OpenAI text-embedding-3-small (1536-dim) + pgvector cosine similarity
- **Category Matching**: Similarity threshold 0.7 (configurable), returns top 5 similar categories
- **Merge Strategy**: Text results first, then semantic results (deduplicated by UUID)
- **Filters**: Category filters and opening hours filters applied after merge

## API Endpoints

### `GET /api/locations/[uuid]`

Fetch a single location by UUID.

**Path Parameters:**

- `uuid`: Location UUID

**Response:**

```typescript
{
  uuid: string
  name: string
  address: string
  latitude: number
  longitude: number
  rating?: number
  photo?: string
  gmapsPlaceId: string
  gmapsUrl: string
  website?: string
  source: 'naka' | 'bluecode'
  timezone: string
  openingHours?: string
  categories: Array<{id: string, name: string, icon: string}>
  createdAt: Date
  updatedAt: Date
}
```

### `GET /api/search`

Hybrid search endpoint combining PostgreSQL FTS with semantic category matching.

**Query Parameters:**

- `q` (required): Search query
- `lat`/`lng` (optional): User location for future distance sorting
- `openNow` (optional): Filter by opening hours (boolean)

**Response:**

```typescript
Array<{
  uuid: string
  name: string
  address: string
  latitude: number
  longitude: number
  rating?: number
  photo?: string
  gmapsPlaceId: string
  gmapsUrl: string
  website?: string
  source: 'naka' | 'bluecode'
  timezone: string
  openingHours?: string
  categoryIds: string // Comma-separated category IDs
  categories: Array<{ id: string, name: string, icon: string }>
  createdAt: Date
  updatedAt: Date
}>
```

### `GET /api/search/autocomplete`

Fast text-only search for autocomplete dropdown (PostgreSQL FTS only). Precomputes embeddings in background for future hybrid searches.

**Query Parameters:**

- `q` (required, min 2 chars): Search query

**Response:**

```typescript
Array<{
  // Same as /api/search response
  highlightedName: string // HTML with <mark> tags highlighting matches
  // ... other fields
}>
```

## Database Schema

The database uses PostgreSQL with PostGIS and pgvector extensions, with a normalized relational schema:

### `categories`

Stores category types with vector embeddings for semantic search.

- `id` (text, PK): Category ID (e.g., "restaurant", "cafe")
- `name` (text): Display name (e.g., "Restaurant", "Cafe")
- `icon` (text): Icon identifier for UI
- `embedding` (vector(1536)): OpenAI text-embedding-3-small vector

**Indexes:**

- Primary key on `id`
- Vector index for cosine similarity search on `embedding`

### `locations`

Main location data with PostGIS geometry and opening hours.

- `uuid` (text, PK): Auto-generated unique identifier
- `name` (text): Location name
- `address` (text): Full address
- `location` (geometry(point, 4326)): **PostGIS point** - Stores lat/lng as geographic point
- `rating` (double precision): User rating (0-5, optional)
- `photo` (text): Image URL (optional)
- `gmapsPlaceId` (text, unique): Google Maps Place ID
- `gmapsUrl` (text): Google Maps URL
- `website` (text): Location website (optional)
- `source` (varchar): Data source (`naka` or `bluecode`)
- `timezone` (text): IANA timezone identifier (e.g., "Europe/Zurich")
- `openingHours` (text): JSON string with weekly opening hours (optional)
- `createdAt`/`updatedAt` (timestamp): Timestamps

**Indexes:**

- Primary key on `uuid`
- Unique index on `gmapsPlaceId`
- GIST spatial index on `location` for efficient proximity queries

**PostGIS Functions:**

- Extract longitude: `ST_X(location)`
- Extract latitude: `ST_Y(location)`
- Calculate distance: `ST_Distance(location1, location2)`
- Find within area: `ST_Within(location, boundary)`

### `location_categories`

Junction table for many-to-many relationship between locations and categories.

- `locationUuid` (text, FK): Foreign key to locations.uuid (cascade delete)
- `categoryId` (text, FK): Foreign key to categories.id (cascade delete)
- `createdAt` (timestamp): Creation timestamp

**Indexes:**

- Composite primary key on (locationUuid, categoryId)
- Index on `locationUuid` for joins
- Index on `categoryId` for reverse lookups

## Scripts

```bash
# Development
pnpm run dev              # Start dev server
pnpm run build            # Build for production
pnpm run preview          # Preview production build

# Database
pnpm run db:setup         # Run migrations and seed data (requires DATABASE_URL)
pnpm run db:generate      # Generate Drizzle migrations from schema changes
pnpm run db:generate-category-embeddings  # Generate OpenAI embeddings for categories

# Code Quality
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix ESLint issues
pnpm run typecheck        # Run TypeScript checks
```

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL Configuration (Supabase Remote)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres

# API Keys
GOOGLE_API_KEY=your_google_api_key

# OpenAI (for generating embeddings)
OPENAI_API_KEY=your_openai_api_key
```

**Note:** The `DATABASE_URL` should use Supabase's connection pooler (port 6543) with `prepare: false` for transaction pooling mode.

## Database Development

The database uses **Supabase** (remote PostgreSQL with PostGIS and pgvector extensions).

**Setup:**

```bash
# Set up database (run migrations and seed data)
DATABASE_URL="your_supabase_url" pnpm run db:setup

# Generate new migrations after schema changes
pnpm run db:generate

# Generate category embeddings (one-time, already committed)
OPENAI_API_KEY="sk-..." pnpm run db:generate-category-embeddings
```

**Database Structure:**

- 301 categories with OpenAI embeddings (1536 dimensions each)
- Embeddings stored directly in `database/scripts/categories.json` as arrays
- Each category object includes an `embeddings` field with 1536 float values

## Learn More

- [Nuxt Documentation](https://nuxt.com/docs)
- [NuxtHub Documentation](https://hub.nuxt.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [UnoCSS Documentation](https://unocss.dev/)
- [Nimiq CSS](https://github.com/onmax/nimiq-ui)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## License

MIT

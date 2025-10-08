# Pay App - Crypto Payment Locations Map

A Nuxt 4 application for discovering locations that accept cryptocurrency payments in Lugano.

## Features

- 🗺️ Browse crypto-friendly locations with images and details
- 🔍 Search locations by name
- 🏷️ Category filtering with semantic embeddings (OpenAI text-embedding-3-small)
- 📍 Optional location-based search with Cloudflare IP geolocation
- 💾 PostgreSQL database with PostGIS for geospatial queries
- 🎨 UnoCSS with Nimiq design system (attributify mode)
- 🧩 Accessible UI with Reka UI components
- 🚀 Deployed on NuxtHub/Cloudflare

## Tech Stack

- **Framework**: Nuxt 4
- **Database**: PostgreSQL with PostGIS extension
- **ORM**: Drizzle ORM
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

## Project Structure

```
pay-app/
├── app/
│   ├── app.vue              # Root component
│   └── pages/
│       └── index.vue        # Main locations page with search
├── server/
│   ├── api/
│   │   ├── categories.get.ts # Get all categories
│   │   └── search.get.ts    # Search locations by name
│   └── utils/
│       ├── drizzle.ts       # Database utilities and types
│       └── geoip.ts         # GeoIP location service
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

## API Endpoints

### `GET /api/categories`

Returns all available categories from the database with their semantic embeddings.

**Response:**

```ts
[
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: 'i-tabler:tools-kitchen-2',
    embedding: [0.012, -0.034, 0.056], // 1536-dim OpenAI embedding (truncated)
    createdAt: '2025-01-15T12:00:00Z'
  }
]
```

### `GET /api/search`

Search for locations by name. All parameters are optional.

**Query Parameters:**

- `q` (optional): Search query to filter locations by name
- `lat` (optional): Latitude for future distance-based sorting
- `lng` (optional): Longitude for future distance-based sorting

**Behavior:**

- Without search query: Returns 10 random locations
- With search query: Returns up to 10 locations matching the search term (case-insensitive)
- Location data is logged but not yet used for sorting
- Uses PostGIS to extract latitude/longitude from geometry points

**Examples:**

```bash
# Get random locations
curl "http://localhost:3000/api/search"

# Search by name
curl "http://localhost:3000/api/search?q=cafe"

# With location (for future distance sorting)
curl "http://localhost:3000/api/search?q=restaurant&lat=46.0037&lng=8.9511"
```

## Database Schema

The database uses PostgreSQL with PostGIS and a normalized relational schema with three tables:

### `categories`

- `id`: Category ID (primary key, e.g., "restaurant", "cafe")
- `name`: Display name (e.g., "Restaurant", "Cafe")
- `icon`: Tabler icon name (e.g., "i-tabler:tools-kitchen-2")
- `embedding`: **pgvector(1536)** - OpenAI text-embedding-3-small vector for semantic search
- `createdAt`: Creation timestamp

### `locations`

- `uuid`: Auto-generated unique identifier (primary key)
- `name`: Location name
- `address`: Full address
- `location`: **PostGIS geometry(point, 4326)** - Stores lat/lng as a single geographic point with GIST spatial index
- `rating`: User rating (0-5)
- `photo`: Image URL (optional)
- `gmapsPlaceId`: Google Maps Place ID
- `gmapsUrl`: Google Maps URL
- `website`: Location website (optional)
- `source`: Data source (`naka` or `bluecode`)
- `createdAt`/`updatedAt`: Timestamps

**PostGIS Functions:**

- Extract longitude: `ST_X(location)`
- Extract latitude: `ST_Y(location)`
- Calculate distance: `ST_Distance(location1, location2)`
- Find within area: `ST_Within(location, boundary)`

### `location_categories`

Junction table for many-to-many relationship between locations and categories:

- `locationUuid`: Foreign key to locations
- `categoryId`: Foreign key to categories
- `createdAt`: Creation timestamp
- Composite primary key on (locationUuid, categoryId)
- Indexed on both foreign keys

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
NUXT_GOOGLE_API_KEY=your_google_api_key

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

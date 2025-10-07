# Pay App - Crypto Payment Locations Map

A Nuxt 4 application for discovering locations that accept cryptocurrency payments in Lugano.

## Features

- 🗺️ Browse crypto-friendly locations with images and details
- 🔍 Search locations by name
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
# Edit .env with your database connection string
```

## Database Setup

This project supports both **remote Supabase** and **local development** with Supabase CLI.

### Option 1: Remote Supabase (Recommended for Production)

The project is configured to use a remote Supabase database by default.

```bash
# 1. Add your Supabase connection string to .env
# DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres

# 2. Run migrations and seeds
pnpm run db:setup
```

**Note:** The connection string uses the Supabase pooler (port 6543) which provides transaction pooling and IPv4 connectivity.

### Option 2: Local Development with Supabase CLI

For local development, you can run a local Supabase instance:

```bash
# 1. Start local Supabase (includes PostgreSQL + PostGIS)
pnpm run db:local

# 2. Update .env to use local connection
# DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# 3. Run migrations and seeds
pnpm run db:setup

# 4. Stop local Supabase when done
pnpm run db:local:stop
```

**Local Supabase includes:**

- PostgreSQL with PostGIS on `localhost:54322`
- Supabase Studio on `localhost:54323`
- REST API on `localhost:54321`

## Development

```bash
# Start development server
pnpm run dev
```

The app will be available at `http://localhost:3000`

**Note:** Make sure PostgreSQL with PostGIS is running and accessible with the credentials in your `.env` file.

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
│   ├── schema.ts            # Drizzle schema (3 tables, PostGIS)
│   ├── docker-compose.yml   # Docker setup for PostgreSQL + PostGIS
│   ├── init.sh              # Database initialization (PostGIS, roles)
│   ├── run-migrations.sh    # Migration runner script
│   ├── rls-policies.sql     # Row Level Security policies
│   ├── seed.sql             # Main seed orchestration
│   ├── migrations/          # Drizzle migrations (auto-generated)
│   └── seeds/
│       ├── categories.sql   # All Google Maps categories
│       └── sources/
│           └── dummy.sql    # Dummy location data
├── nuxt.config.ts           # Nuxt configuration
├── uno.config.ts            # UnoCSS configuration
├── drizzle.config.ts        # Drizzle ORM configuration
└── CLAUDE.md                # AI development guidance
```

## API Endpoints

### `GET /api/categories`

Returns all available categories from the database.

**Response:**

```json
[
  { "id": "restaurant", "name": "Restaurant" },
  { "id": "cafe", "name": "Cafe" },
  { "id": "lodging", "name": "Lodging" }
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
pnpm run db:setup         # Run migrations and seeds (local or remote)
pnpm run db:generate      # Generate migrations from schema changes
pnpm run db:push          # Push migrations to remote Supabase via CLI
pnpm run db:local         # Start local Supabase (PostgreSQL + PostGIS)
pnpm run db:local:stop    # Stop local Supabase

# Code Quality
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix ESLint issues
pnpm run typecheck        # Run TypeScript checks
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Database Connection String
# Remote Supabase (default)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres

# Or Local Supabase (when using pnpm run db:local)
# DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# API Keys
NUXT_GOOGLE_API_KEY=your_google_api_key
```

## Database Development

The database uses **Supabase** for PostgreSQL + PostGIS hosting.

### Remote Database

The project is connected to a remote Supabase instance. All migrations and seeds are tracked in the `database/` folder and can be applied via:

```bash
pnpm run db:setup
```

### Local Database

For local development, you can spin up a local Supabase instance:

```bash
pnpm run db:local
```

**Local Access:**

- **Supabase Studio**: http://localhost:54323
- **PostgreSQL**: `localhost:54322`
- **REST API**: http://localhost:54321

See [`database/README.md`](database/README.md) for PostGIS examples and database structure.

## Learn More

- [Nuxt Documentation](https://nuxt.com/docs)
- [NuxtHub Documentation](https://hub.nuxt.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [UnoCSS Documentation](https://unocss.dev/)
- [Nimiq CSS](https://github.com/onmax/nimiq-ui)
- [PostGIS Documentation](https://postgis.net/documentation/)

## License

MIT

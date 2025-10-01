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
# Edit .env with your PostgreSQL credentials

# Start PostgreSQL + PostGIS with Docker
pnpm run db:start
# Database is automatically seeded on first start
```

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
pnpm run db:start         # Start PostgreSQL + PostGIS with Docker
pnpm run db:stop          # Stop database
pnpm run db:restart       # Restart database (useful for reseeding)
pnpm run db:generate      # Generate migrations (stored in database/migrations/)

# Code Quality
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix ESLint issues
pnpm run typecheck        # Run TypeScript checks
```

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=postgres

# JWT Configuration (if using Supabase Studio)
JWT_SECRET=your_jwt_secret

# API Keys
ANON_KEY=your_anon_key
SERVICE_ROLE_KEY=your_service_role_key
NUXT_GOOGLE_API_KEY=your_google_api_key

# Kong & Studio (optional)
KONG_HTTP_PORT=8100
STUDIO_PORT=4000
SUPABASE_PUBLIC_URL=http://localhost:8100
```

## Database Development

This repository includes a PostgreSQL + PostGIS setup in the `database/` directory.

**Quick Start:**

```bash
pnpm run db:start      # Start services
```

**Access:**

- **Supabase Studio**: http://localhost:4000
- **PostgreSQL**: `localhost:5432`
- **REST API**: http://localhost:8100

See [`database/README.md`](database/README.md) for PostGIS examples and REST API usage.

## Learn More

- [Nuxt Documentation](https://nuxt.com/docs)
- [NuxtHub Documentation](https://hub.nuxt.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [UnoCSS Documentation](https://unocss.dev/)
- [Nimiq CSS](https://github.com/onmax/nimiq-ui)
- [PostGIS Documentation](https://postgis.net/documentation/)

## License

MIT

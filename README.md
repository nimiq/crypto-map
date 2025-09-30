# Pay App - Crypto Payment Locations Map

A Nuxt 4 application for discovering locations that accept cryptocurrency payments in Lugano.

## Features

- 🗺️ Browse crypto-friendly locations with images and details
- 🔍 Filter by Google Maps categories (restaurant, cafe, lodging, etc.)
- 📍 Optional location-based search with Cloudflare IP geolocation
- 💾 SQLite database with Drizzle ORM and normalized schema
- 🎨 UnoCSS with Nimiq design system (attributify mode)
- 🧩 Accessible UI with Reka UI components
- 🚀 Deployed on NuxtHub (Cloudflare Pages + D1)

## Tech Stack

- **Framework**: Nuxt 4
- **Database**: SQLite (via NuxtHub) with Drizzle ORM
- **Styling**: UnoCSS with `nimiq-css` and `unocss-preset-onmax`
- **UI Components**: Reka UI
- **Validation**: Valibot
- **Deployment**: NuxtHub (Cloudflare Pages + D1)

## Installation

First, [install pnpm](https://pnpm.io/installation) if you haven't already.

```bash
# Install dependencies
pnpm install

# Generate database migrations
pnpm run db:generate
```

## Development

```bash
# Start development server
pnpm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
pay-app/
├── app/
│   ├── app.vue              # Root component
│   └── pages/
│       └── index.vue        # Main locations page with filters
├── server/
│   ├── api/
│   │   ├── categories.get.ts # Get all categories
│   │   └── search.get.ts    # Search locations with filters
│   ├── database/
│   │   ├── schema.ts        # Drizzle schema (3 tables)
│   │   └── migrations/      # Database migrations
│   ├── plugins/
│   │   └── seed.ts          # Auto-seed database on startup
│   └── utils/
│       ├── dummyData.ts     # Sample location data for seeding
│       ├── drizzle.ts       # Database utilities and types
│       └── geoip.ts         # GeoIP location service
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

Search for locations by category. All parameters are optional.

**Query Parameters:**

- `categories` (optional): Array of Google Maps category IDs (e.g., `restaurant`, `cafe`, `bank`)
- `lat` (optional): Latitude for future distance-based sorting
- `lng` (optional): Longitude for future distance-based sorting

**Behavior:**
- Without categories: Returns 10 random locations
- With categories: Returns all locations matching any of the specified categories
- Location data is logged but not yet used for sorting

**Examples:**

```bash
# Get random locations
curl "http://localhost:3000/api/search"

# Filter by categories
curl "http://localhost:3000/api/search?categories=restaurant&categories=cafe"

# With location (for future distance sorting)
curl "http://localhost:3000/api/search?categories=restaurant&lat=46.0037&lng=8.9511"
```

## Database Schema

The database uses a normalized relational schema with three tables:

### `categories`
- `id`: Category ID (primary key, e.g., "restaurant", "cafe")
- `name`: Display name (e.g., "Restaurant", "Cafe")
- `createdAt`: Creation timestamp

### `locations`
- `uuid`: Auto-generated unique identifier (primary key)
- `name`: Location name
- `address`: Full address
- `latitude`/`longitude`: Geographic coordinates
- `rating`: User rating (0-5)
- `photo`: Image URL (optional)
- `gmapsPlaceId`: Google Maps Place ID
- `gmapsUrl`: Google Maps URL
- `website`: Location website (optional)
- `categories`: JSON array of category IDs (denormalized for performance)
- `source`: Data source (`naka` or `bluecode`)
- `createdAt`/`updatedAt`: Timestamps

### `location_categories`
Junction table for many-to-many relationship between locations and categories:
- `locationUuid`: Foreign key to locations
- `categoryId`: Foreign key to categories
- Composite primary key on (locationUuid, categoryId)

**Note:** Categories are stored both in the `locations.categories` JSON field (for quick filtering) and in the `location_categories` junction table (for relational queries).

## Scripts

```bash
# Development
pnpm run dev              # Start dev server
pnpm run build            # Build for production
pnpm run preview          # Preview production build

# Database
pnpm run db:generate      # Generate migrations

# Code Quality
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix ESLint issues
pnpm run typecheck        # Run TypeScript checks
```

## Environment Variables

Create a `.env` file with:

```env
NUXT_GOOGLE_API_KEY=your_google_api_key_here
```

## Learn More

- [Nuxt Documentation](https://nuxt.com/docs)
- [NuxtHub Documentation](https://hub.nuxt.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [UnoCSS Documentation](https://unocss.dev/)
- [Nimiq CSS](https://github.com/onmax/nimiq-ui)

## License

MIT

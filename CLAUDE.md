# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pay App is a Nuxt 4 application that helps users discover crypto-friendly locations in Lugano. It uses NuxtHub for deployment on Cloudflare with D1 (SQLite) database, styled with UnoCSS using the Nimiq design system.

## Development Commands

```bash
# Development
pnpm run dev              # Start dev server on localhost:3000
pnpm run build            # Build for production
pnpm run preview          # Preview production build

# Database
pnpm run db:generate      # Generate Drizzle migrations from schema changes

# Code Quality
pnpm run lint             # Run ESLint with cache
pnpm run lint:fix         # Auto-fix ESLint issues
pnpm run typecheck        # Run TypeScript type checking
```

## Architecture

### Database Architecture

The app uses a **normalized relational schema** with three tables:

1. **`categories`** - Stores all unique Google Maps category types (e.g., "cafe", "restaurant", "bank")
   - Extracted dynamically from location data
   - Uses category ID as primary key (e.g., "food", "lodging")

2. **`locations`** - Main location data with denormalized categories
   - Primary key: auto-generated UUID
   - Contains a `categories` JSON array for backwards compatibility and quick filtering
   - Indexed on the `categories` JSON field for efficient searching
   - Note: Categories are stored BOTH as JSON in locations AND in the junction table

3. **`location_categories`** - Junction table for many-to-many relationship
   - Links locations to categories via foreign keys
   - Composite primary key on (locationUuid, categoryId)
   - Indexed on both foreign keys

**Important**: When adding locations, you must:
1. Insert into `locations` table with categories as JSON array
2. Insert corresponding rows into `location_categories` junction table
3. Categories are stored in TWO places for performance (denormalized pattern)

### Database Seeding

- **Automatic seeding** happens via `server/plugins/seed.ts` when the app starts
- The plugin checks if the database is empty before seeding
- Seed data comes from `server/utils/dummyData.ts` (DUMMY_LOCATIONS array)
- **Never create manual seed endpoints** - seeding only happens in the plugin
- The seeding process:
  1. Extracts unique categories from all locations
  2. Inserts categories
  3. Inserts locations one-by-one (to handle auto-generated fields)
  4. Creates location-category relationships in junction table

### API Endpoints

**`GET /api/categories`**
- Returns all categories from the database
- Used to populate filter UI
- Categories are dynamically extracted from location data

**`GET /api/search`**
- Query params: `categories` (optional array), `lat`/`lng` (optional)
- If lat/lng not provided, attempts Cloudflare IP geolocation via `locateByHost()`
- **Location data is available but NOT used for sorting yet** - just logged to console
- Returns random 10 locations if no categories selected
- Filters using SQLite JSON functions when categories are provided
- Uses `json_each()` to search within the categories JSON array

### Styling System

The app uses **UnoCSS with Nimiq presets**:
- `presetOnmax()` - Base utilities
- `presetNimiq()` - Nimiq design system utilities and attributify mode
- Utilities are applied via **attributify syntax** directly on elements (e.g., `flex="~ col gap-16"`)
- Nimiq CSS provides the `f-` prefix utilities for consistent spacing/typography
- Custom utility examples: `f-mb-lg`, `f-py-xl`, `f-px-md`, `text="neutral-900 f-lg"`

### UI Components

- **Reka UI** is used for accessible components (Vue port of Radix UI)
- Auto-imported via `reka-ui/nuxt` module in nuxt.config.ts
- Example: `ToggleGroupRoot` + `ToggleGroupItem` for category filters
- Must use the `Root` component (e.g., `ToggleGroupRoot`, not `ToggleGroup`)

### Type Safety

- **Valibot** is used for runtime validation (not Zod)
- Query parameters are validated in API routes using `v.safeParse()`
- Example pattern: `v.pipe(v.string(), v.transform(Number), v.number())`
- Runtime config validation via `nuxt-safe-runtime-config` with Valibot schema

### Database Access

- Use `useDrizzle()` helper to get database instance
- Import schema as `tables` from `server/utils/drizzle.ts`
- Type exports: `Location`, `Category`, `LocationCategory`
- Access NuxtHub database via `hubDatabase()` (abstracted in useDrizzle)
- SQLite-specific: Use `sql` tagged templates for raw queries and JSON operations

## Key Patterns

### Adding New Locations
1. Add to `server/utils/dummyData.ts` DUMMY_LOCATIONS array
2. Categories must be valid Google Maps types (snake_case strings)
3. Restart dev server to trigger automatic re-seeding
4. The plugin will handle both location insertion and junction table relationships

### Category Filtering
- Categories use raw Google Maps types (e.g., "restaurant", "cafe", "lodging")
- The old `CATEGORY_MAPPING` system was removed - now using direct Google types
- UI displays formatted category names (underscores → spaces, title case)
- Backend stores raw snake_case IDs

### Geolocation
- Cloudflare provides `cf-connecting-ip` header in production
- Dev environment requires manual lat/lng query params
- Currently location is retrieved but NOT used for distance sorting

## Configuration Files

- **`nuxt.config.ts`** - Nuxt config with NuxtHub, UnoCSS, Reka UI modules
- **`drizzle.config.ts`** - SQLite dialect, schema and migration paths
- **`uno.config.ts`** - UnoCSS with Nimiq presets
- **`eslint.config.mjs`** - Antfu's ESLint config with Nuxt integration

## Environment Variables

Required in `.env`:
```
NUXT_GOOGLE_API_KEY=your_api_key
```

Validated via `safeRuntimeConfig` using Valibot schema.

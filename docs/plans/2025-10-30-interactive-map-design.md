# Interactive Map Feature Design

**Date:** 2025-10-30
**Feature:** Interactive location map with MVT tiles
**Route:** `/map`

## Overview

Add dedicated map page showing all crypto-friendly locations using Maplibre GL JS with custom MVT tiles served from PostGIS. Includes search integration, category filtering, clustering, and location details via bottom drawer.

## Architecture

### Frontend Stack
- **Maplibre GL JS** - Vector map rendering with MVT support
- **Vaul Vue** - Bottom drawer for location details
- **Supercluster** - Marker clustering at high zoom levels
- **Existing components** - Reuse search input and category filters

### Backend Stack
- **PostGIS ST_AsMVT()** - Generate MVT tiles from location geometry
- **Custom API** `/api/tiles/{z}/{x}/{y}.mvt` - Serve vector tiles
- **NuxtHub caching** - 7-day tile cache with long TTL
- **Existing search API** - Reuse `/api/search` for map search

### Data Flow
1. User opens `/map` → Maplibre initializes with OSM base tiles
2. Map requests location tiles from `/api/tiles/{z}/{x}/{y}.mvt`
3. PostGIS generates MVT tiles from `locations` table geometry
4. Tiles cached in NuxtHub with 7-day TTL
5. Client renders markers with Naka logo + name labels
6. User searches → Reuse `/api/search` → Highlight matching locations
7. User clicks marker → Vaul drawer opens with location details

## API Design

### `GET /api/tiles/{z}/{x}/{y}.mvt`

**Parameters:**
- `z` - Zoom level (10-18, enforced server-side)
- `x` - Tile X coordinate
- `y` - Tile Y coordinate

**PostGIS Query:**
```sql
SELECT ST_AsMVT(tile, 'locations', 4096, 'geom')
FROM (
  SELECT
    uuid,
    name,
    (SELECT array_agg(categoryId)
     FROM location_categories
     WHERE locationUuid = uuid) as categoryIds,
    ST_AsMVTGeom(
      location,
      ST_TileEnvelope(z, x, y),
      4096,
      256,  -- buffer for label rendering
      true  -- clip geometry
    ) AS geom
  FROM locations
  WHERE location && ST_TileEnvelope(z, x, y)
    AND z >= 10  -- min zoom: regional view
    AND z <= 18  -- max zoom: street level
) AS tile
```

**Response:**
- Content-Type: `application/vnd.mapbox-vector-tile`
- Cache-Control: `public, max-age=604800` (7 days)

**Tile Layer Structure:**
```json
{
  "locations": {
    "features": [
      {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": {
          "uuid": "...",
          "name": "Naka Lugano",
          "categoryIds": ["restaurant", "cafe"]
        }
      }
    ]
  }
}
```

## Frontend Components

### Page Structure (`/pages/map.vue`)
```
<MapContainer>
  <SearchInput floating top />
  <CategoryFilters floating top-right />
  <MaplibreMap>
    <OSMTileLayer />
    <LocationMVTLayer source="/api/tiles/{z}/{x}/{y}.mvt" />
    <ClusterLayer /> <!-- zoom < 14 -->
    <MarkerLayer /> <!-- zoom >= 14 -->
  </MaplibreMap>
  <VaulDrawer />
</MapContainer>
```

### Marker Rendering
- **Zoom 10-13**: Supercluster groups nearby locations into numbered clusters
- **Zoom 14-18**: Individual markers with Naka logo + name label
- **Label collision**: Maplibre's `text-allow-overlap: false` and `text-optional: true`

### Marker Style (Maplibre JSON)
```json
{
  "layout": {
    "icon-image": "naka-logo",
    "icon-size": 0.4,
    "text-field": ["get", "name"],
    "text-size": 10,
    "text-offset": [0, 1.5],
    "text-anchor": "top",
    "text-optional": true
  },
  "paint": {
    "text-color": "#1F2348",
    "text-halo-color": "#fff",
    "text-halo-width": 2
  }
}
```

## Filtering & State

### Category Filters
- Reuse `ToggleGroupRoot` component from main search
- Selected categories in URL: `/map?categories=restaurant,cafe`
- Maplibre filter expression:
```js
map.setFilter('locations-layer', [
  'in',
  ['get', 'categoryIds'],
  ['literal', selectedCategories]
])
```

### Open Now Filter
- Client-side only (no server involvement)
- Fetch all locations' opening hours on page load
- Calculate open/closed in browser based on current time
- Apply as additional Maplibre filter layer

### State Management
- **URL as source of truth**: `/map?q=coffee&categories=cafe&openNow=true&lat=46.01&lng=8.96&zoom=15`
- Vue composable `useMapState()` for reactive filters
- Sync map viewport (center, zoom) with URL for shareable links

## Interactions

### Marker Click Flow
1. User clicks marker → Extract `uuid` from feature properties
2. Fetch full data from `/api/locations/{uuid}`
3. Open Vaul drawer with location card (name, address, rating, photo, opening hours)
4. Drawer includes "Get Directions" (Google Maps link) and "View Details" (navigate to `/locations/{uuid}`)

### Search Integration
- Search input uses existing `/api/search` endpoint
- Results highlighted on map by filtering visible features
- Option: Fly to first result location
- Clear search shows all markers again

## Error Handling

### Tile Loading
- Loading state: Maplibre's default loading spinner
- Tile 404s: Return empty MVT (no error to user)
- Network errors: Maplibre retries 3x, then shows error icon
- Zoom constraint violations: Server returns 400 for z < 10 or z > 18

### Data Fetching
- Location detail fetch fails: Toast "Unable to load location details"
- Search API fails: Fallback to showing all markers, display warning banner
- Opening hours missing: Treat as "hours unknown", exclude from openNow filter

### User Experience
- Empty states: "No locations found in this area"
- Geolocation denied: Default to Lugano center (46.0037°N, 8.9511°E, zoom 13)
- Slow 3G: Tiles cached aggressively, OSM tiles load progressively

## Performance

### Caching
- **Tile caching**: NuxtHub Blob storage for 7-day cache
- **CloudFlare edge caching** in production
- **Debounce viewport changes**: Request new tiles after 150ms map idle

### Optimization
- **Lazy load Maplibre**: Code-split map library (~450KB)
- **Marker limit**: Supercluster prevents rendering 1000+ individual markers
- **Tile generation target**: < 100ms per tile

### Monitoring
- Log tile generation time in server
- Track tile cache hit rate
- Monitor Maplibre WebGL errors

## Implementation Phases

### Phase 1: Core Map Infrastructure
- Set up `/map` route and page component
- Install and configure Maplibre GL JS
- Implement `/api/tiles/{z}/{x}/{y}.mvt` endpoint with PostGIS
- Add OSM base tiles + custom location MVT layer
- Basic marker rendering (no clustering yet)

### Phase 2: Search & Filters
- Float search input on map page (reuse component)
- Integrate `/api/search` API with map highlighting
- Add category filter UI (reuse toggle group)
- Implement client-side filter expressions for Maplibre
- Add categoryIds to tile properties

### Phase 3: Clustering & Labels
- Integrate Supercluster for zoom < 14
- Configure smart label collision detection
- Add Naka logo as custom icon
- Style clusters and individual markers
- Handle zoom transitions smoothly

### Phase 4: Details & Interactions
- Install Vaul Vue for bottom drawer
- Implement marker click → drawer open flow
- Fetch location details from `/api/locations/{uuid}`
- Add "Get Directions" and "View Details" actions
- URL state management for shareability

### Phase 5: Polish & Performance
- Open now client-side filtering
- Loading states and error handling
- Tile caching with NuxtHub
- Code-split Maplibre bundle
- Responsive mobile layout

## Design Decisions

### Why Custom MVT Tiles?
- Best performance for vector rendering
- Standard approach for interactive maps
- Efficient caching and bandwidth usage
- Native Maplibre support

### Why Client-Side Filtering?
- Simpler implementation (no per-filter tile generation)
- Tiles are immutable and cacheable
- Fast filter toggling (no server roundtrip)
- Trade-off: Slightly larger tiles with categoryIds array (~30% increase)

### Why Separate `/map` Route?
- Clean separation from search UI
- Different interaction model (exploration vs search)
- Easier to optimize each experience independently
- Simpler state management

### Why Supercluster?
- Industry standard for marker clustering
- Efficient performance with thousands of markers
- Smooth zoom transitions
- Small bundle size (~15KB)

## Technical Constraints

- **Zoom limits**: z=10 (min) to z=18 (max) - prevents loading too many markers or too wide area
- **Tile extent**: 4096 (standard MVT resolution)
- **Buffer**: 256px (prevents label clipping at tile edges)
- **Max markers without clustering**: ~100 (enforced by Supercluster threshold)
- **Tile cache TTL**: 7 days (locations rarely change)

## Future Enhancements

- Distance-based sorting using user geolocation
- Heatmap layer for location density
- Custom map style with Nimiq branding
- Offline map caching with service worker
- Directions routing integration
- Share specific map view via URL

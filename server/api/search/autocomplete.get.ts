import * as v from 'valibot'

const querySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
  lat: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
  lng: v.optional(v.pipe(v.string(), v.transform(Number), v.number())),
})

// Check if geo result is a strong match (name closely matches query)
function isStrongGeoMatch(geo: GeoResult, query: string): boolean {
  const q = query.toLowerCase().trim()
  const name = geo.name.toLowerCase()
  // Exact match or query is prefix of name
  return name === q || name.startsWith(q) || q.startsWith(name)
}

export default defineCachedEventHandler(async (event) => {
  const { q: searchQuery, lat, lng } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  // Precompute embedding in background (non-blocking)
  event.waitUntil(generateEmbeddingCached(searchQuery).catch(() => {}))

  const origin = lat !== undefined && lng !== undefined ? { lat, lng } : undefined

  // Fetch both in parallel
  const [dbResults, geoResults] = await Promise.all([
    searchLocationsByText(searchQuery, { fetchLimit: 10, origin }),
    searchNominatim(searchQuery, { lat, lng, limit: 3 }),
  ])

  // Compute primary category for each location
  const locationCategories = new Map<string, string[]>()
  for (const location of dbResults) {
    locationCategories.set(location.uuid, location.categories.map(c => c.id))
  }
  const primaryCategoryIds = await getMostSpecificCategoriesBatch(locationCategories)

  for (const location of dbResults) {
    const primaryCategoryId = primaryCategoryIds.get(location.uuid)
    if (primaryCategoryId)
      location.primaryCategory = location.categories.find(c => c.id === primaryCategoryId)
  }

  // Split geo results: strong matches go first, weak matches go after locations
  const strongGeoMatches = geoResults.filter(g => isStrongGeoMatch(g, searchQuery))
  const weakGeoMatches = geoResults.filter(g => !isStrongGeoMatch(g, searchQuery))

  return { locations: dbResults, geo: strongGeoMatches, geoWeak: weakGeoMatches }
}, {
  maxAge: 60 * 60 * 24 * 7, // Cache for 7 days
  getKey: (event) => {
    const query = getQuery(event)
    // Round to 1 decimal (~11km precision) to avoid cache fragmentation
    const lat = query.lat ? Math.round(Number(query.lat) * 10) / 10 : ''
    const lng = query.lng ? Math.round(Number(query.lng) * 10) / 10 : ''
    return `autocomplete:${query.q}:${lat}:${lng}`
  },
  swr: true, // Stale-while-revalidate
})

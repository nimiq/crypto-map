import { consola } from 'consola'
import * as v from 'valibot'

const querySchema = v.object({
  lat: v.optional(v.pipe(v.string(), v.transform(Number), v.number('Latitude must be a number'), v.minValue(-90, 'Latitude must be >= -90'), v.maxValue(90, 'Latitude must be <= 90'))),
  lng: v.optional(v.pipe(v.string(), v.transform(Number), v.number('Longitude must be a number'), v.minValue(-180, 'Longitude must be >= -180'), v.maxValue(180, 'Longitude must be <= 180'))),
  q: v.optional(v.string()),
  openNow: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  walkable: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  page: v.fallback(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1)), 1),
  limit: v.fallback(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100)), 20),
})

export default defineCachedEventHandler(async (event) => {
  const { q: searchQuery, openNow = false, walkable = false, lat: qLat, lng: qLng, page = 1, limit = 20 } = await getValidatedQuery(event, data => v.parse(querySchema, data))
  if (!searchQuery || searchQuery.trim().length === 0)
    return { results: [], hasMore: false, page, total: 0 }

  // Use query lat/lng if provided, otherwise fallback to Cloudflare IP geolocation
  let lat = qLat
  let lng = qLng

  if (!lat || !lng) {
    try {
      const cfIp = event.node.req.headers['cf-connecting-ip'] as string | undefined
      const geoLocation = await locateByHost(cfIp)
      lat = geoLocation.lat
      lng = geoLocation.lng
      consola.info(`Using Cloudflare IP geolocation: ${lat}, ${lng}`, { tag: 'geolocation' })
    }
    catch (error) {
      consola.warn('Failed to get Cloudflare IP geolocation', { tag: 'geolocation', error })
    }
  }
  else {
    consola.info(`User location from query: ${lat}, ${lng}`, { tag: 'geolocation' })
  }

  // Build search options with origin and distance filter
  const searchOptions: SearchLocationOptions = { page, limit }
  if (lat !== undefined && lng !== undefined) {
    searchOptions.origin = { lat, lng }
    // Apply 1.5km walkable distance filter when walkable flag is true
    if (walkable) {
      searchOptions.maxDistanceMeters = 1500
    }
  }

  // Hybrid search: fast text search + smart semantic matching
  const [textResults, categoryResults] = await Promise.all([
    searchLocationsByText(searchQuery, searchOptions),
    searchLocationsBySimilarCategories(searchQuery, searchOptions),
  ])

  // Text results prioritized - they appear first in the list
  const combinedMap = new Map<string, SearchLocationResponse>()

  for (const loc of textResults || []) {
    combinedMap.set(loc.uuid, loc)
  }

  // Category results added only if not already matched by text search
  for (const loc of categoryResults || []) {
    if (!combinedMap.has(loc.uuid))
      combinedMap.set(loc.uuid, loc)
  }

  const searchResults = Array.from(combinedMap.values())

  // Sort by distance if origin is provided and walkable is true
  if (walkable && searchOptions.origin) {
    searchResults.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
  }

  // Apply openNow filter
  const filteredResults = openNow ? filterOpenNow(searchResults) : searchResults

  // Calculate pagination metadata
  const total = filteredResults.length
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedResults = filteredResults.slice(startIndex, endIndex)
  const hasMore = endIndex < total

  return { results: paginatedResults, hasMore, page, total }
}, {
  maxAge: 60 * 60 * 24, // Cache for 1 day
  getKey: (event) => {
    const query = getQuery(event)
    return `search:${query.q}:${query.lat || ''}:${query.lng || ''}:${query.openNow || ''}:${query.walkable || ''}:${query.page || 1}:${query.limit || 20}`
  },
  swr: true, // Stale-while-revalidate
})

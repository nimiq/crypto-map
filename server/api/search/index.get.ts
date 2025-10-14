import { consola } from 'consola'
import * as v from 'valibot'

// Plan B Forum at Lugano Convention Centre (Palazzo dei Congressi)
const CONFERENCE_CENTER = { lat: 46.005030, lng: 8.956060 }

const querySchema = v.object({
  lat: v.optional(v.pipe(
    v.string(),
    v.transform(Number),
    v.number('Latitude must be a number'),
    v.minValue(-90, 'Latitude must be >= -90'),
    v.maxValue(90, 'Latitude must be <= 90'),
  )),
  lng: v.optional(v.pipe(
    v.string(),
    v.transform(Number),
    v.number('Longitude must be a number'),
    v.minValue(-180, 'Longitude must be >= -180'),
    v.maxValue(180, 'Longitude must be <= 180'),
  )),
  q: v.optional(v.string()),
  openNow: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  walkable: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
})

export default defineCachedEventHandler(async (event) => {
  const { q: searchQuery, openNow = false, walkable = false, lat: qLat, lng: qLng } = await getValidatedQuery(event, data => v.parse(querySchema, data))
  if (!searchQuery || searchQuery.trim().length === 0)
    return []

  // Default to Lugano Convention Center if no lat/lng provided
  const { lat, lng } = (!qLat || !qLng) ? CONFERENCE_CENTER : { lat: qLat, lng: qLng }

  if (lat !== undefined && lng !== undefined)
    consola.info(`User location: ${lat}, ${lng}`, { tag: 'geolocation' })

  // Build search options with origin and distance filter
  const searchOptions: SearchLocationOptions = {}
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

  let searchResults = Array.from(combinedMap.values())

  // Sort by distance if origin is provided and walkable is true
  if (walkable && searchOptions.origin) {
    searchResults.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    // Limit to 10 results to match the DB limit
    searchResults = searchResults.slice(0, 10)
  }

  return openNow ? filterOpenNow(searchResults) : searchResults
}, {
  maxAge: 60 * 60 * 24, // Cache for 1 day
  getKey: (event) => {
    const query = getQuery(event)
    return `search:${query.q}:${query.lat || ''}:${query.lng || ''}:${query.openNow || ''}:${query.walkable || ''}`
  },
  swr: true, // Stale-while-revalidate
})

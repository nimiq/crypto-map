import { consola } from 'consola'
import * as v from 'valibot'

const querySchema = v.object({
  lat: v.optional(v.pipe(v.string(), v.transform(Number), v.number('Latitude must be a number'), v.minValue(-90, 'Latitude must be >= -90'), v.maxValue(90, 'Latitude must be <= 90'))),
  lng: v.optional(v.pipe(v.string(), v.transform(Number), v.number('Longitude must be a number'), v.minValue(-180, 'Longitude must be >= -180'), v.maxValue(180, 'Longitude must be <= 180'))),
  q: v.optional(v.string()),
  categories: v.optional(v.union([v.string(), v.array(v.string())])),
  openNow: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  nearMe: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  page: v.fallback(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1)), 1),
  limit: v.fallback(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100)), 20),
})

async function searchHandler(event: any) {
  const { q: searchQuery, categories: rawCategories, openNow = false, nearMe = false, lat: qLat, lng: qLng, page = 1, limit = 20 } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  // Normalize categories to array
  const categories = rawCategories ? (Array.isArray(rawCategories) ? rawCategories : [rawCategories]) : undefined

  // Require either query or categories
  if ((!searchQuery || searchQuery.trim().length === 0) && !categories)
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

  let searchResults: SearchLocationResponse[]

  if ((!searchQuery || searchQuery.trim().length === 0) && categories) {
    // Fetch extra when filtering to ensure we have enough results after filtering
    const fetchMultiplier = openNow ? 3 : 1
    const effectiveLimit = limit * fetchMultiplier

    const searchOptions: SearchLocationOptions = {
      page: 1,
      limit: effectiveLimit + ((page - 1) * limit),
    }
    if (lat !== undefined && lng !== undefined) {
      searchOptions.origin = { lat, lng }
      if (nearMe) {
        searchOptions.maxDistanceMeters = 1500
      }
    }

    searchResults = await searchLocationsByCategories(categories, searchOptions)

    const filteredResults = openNow ? filterOpenNow(searchResults) : searchResults

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedResults = filteredResults.slice(startIndex, endIndex)
    const hasMore = endIndex < filteredResults.length || searchResults.length === effectiveLimit + ((page - 1) * limit)

    return {
      results: paginatedResults,
      hasMore,
      page,
      total: filteredResults.length,
    }
  }
  else {
    // Fetch extra to account for deduplication and filtering
    const filterMultiplier = openNow ? 4 : 2
    const fetchLimit = Math.min(page * limit * filterMultiplier, 400)

    const searchOptions: SearchLocationOptions = { fetchLimit }
    if (lat !== undefined && lng !== undefined) {
      searchOptions.origin = { lat, lng }
      if (nearMe) {
        searchOptions.maxDistanceMeters = 1500
      }
    }
    if (categories) {
      searchOptions.categories = categories
    }

    const [textResults, categoryResults] = await Promise.all([
      searchLocationsByText(searchQuery!, searchOptions),
      searchLocationsBySimilarCategories(searchQuery!, searchOptions),
    ])

    // Text results prioritized
    const combinedMap = new Map<string, SearchLocationResponse>()

    for (const loc of textResults || []) {
      combinedMap.set(loc.uuid, loc)
    }

    for (const loc of categoryResults || []) {
      if (!combinedMap.has(loc.uuid))
        combinedMap.set(loc.uuid, loc)
    }

    searchResults = Array.from(combinedMap.values())

    if (nearMe && searchOptions.origin) {
      searchResults.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    }

    const filteredResults = openNow ? filterOpenNow(searchResults) : searchResults

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedResults = filteredResults.slice(startIndex, endIndex)
    const hasMore = endIndex < filteredResults.length

    return { results: paginatedResults, hasMore, page, total: filteredResults.length }
  }
}

const cachedSearchHandler = defineCachedEventHandler(searchHandler, {
  maxAge: 60 * 60 * 24,
  getKey: (event) => {
    const query = getQuery(event)
    const categoriesKey = query.categories ? (Array.isArray(query.categories) ? query.categories.join(',') : query.categories) : ''
    return `search:${query.q}:${query.lat || ''}:${query.lng || ''}:${query.openNow || ''}:${query.nearMe || ''}:${categoriesKey}:${query.page || 1}:${query.limit || 20}`
  },
  swr: true,
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  // Bypass cache for openNow to ensure real-time availability data
  if (query.openNow === 'true') {
    return searchHandler(event)
  }
  return cachedSearchHandler(event)
})

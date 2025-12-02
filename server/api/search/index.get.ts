import { consola } from 'consola'
import * as v from 'valibot'

const querySchema = v.object({
  lat: v.optional(v.pipe(v.string(), v.transform(Number), v.number('Latitude must be a number'), v.minValue(-90, 'Latitude must be >= -90'), v.maxValue(90, 'Latitude must be <= 90'))),
  lng: v.optional(v.pipe(v.string(), v.transform(Number), v.number('Longitude must be a number'), v.minValue(-180, 'Longitude must be >= -180'), v.maxValue(180, 'Longitude must be <= 180'))),
  q: v.optional(v.string()),
  categories: v.optional(v.union([v.string(), v.array(v.string())])),
  openNow: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  nearMe: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
})

async function searchHandler(event: any) {
  const { q: searchQuery, categories: rawCategories, openNow = false, nearMe = false, lat: qLat, lng: qLng } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  // Normalize categories to array
  const categories = rawCategories ? (Array.isArray(rawCategories) ? rawCategories : [rawCategories]) : undefined

  // Require either query or categories
  if ((!searchQuery || searchQuery.trim().length === 0) && !categories)
    return []

  // Use query lat/lng if provided, otherwise fallback to Cloudflare geolocation
  let lat = qLat
  let lng = qLng

  if (!lat || !lng) {
    const cf = event.context.cf as { latitude?: string, longitude?: string } | undefined
    if (cf?.latitude && cf?.longitude) {
      lat = Number(cf.latitude)
      lng = Number(cf.longitude)
      consola.info(`Using Cloudflare geolocation: ${lat}, ${lng}`, { tag: 'geolocation' })
    }
  }
  else {
    consola.info(`User location from query: ${lat}, ${lng}`, { tag: 'geolocation' })
  }

  let searchResults: SearchLocationResponse[]

  if ((!searchQuery || searchQuery.trim().length === 0) && categories) {
    const searchOptions: SearchLocationOptions = {
      fetchLimit: 500,
    }
    if (lat !== undefined && lng !== undefined) {
      searchOptions.origin = { lat, lng }
      if (nearMe) {
        searchOptions.maxDistanceMeters = 1500
      }
    }

    searchResults = await searchLocationsByCategories(categories, searchOptions)

    const filteredResults = openNow ? filterOpenNow(searchResults) : searchResults

    // Compute primary category for each location
    const locationCategories = new Map<string, string[]>()
    for (const location of filteredResults) {
      locationCategories.set(location.uuid, location.categories.map(c => c.id))
    }
    const primaryCategoryIds = await getMostSpecificCategoriesBatch(locationCategories)

    // Add primaryCategory to results
    for (const location of filteredResults) {
      const primaryCategoryId = primaryCategoryIds.get(location.uuid)
      if (primaryCategoryId) {
        location.primaryCategory = location.categories.find(c => c.id === primaryCategoryId)
      }
    }

    return filteredResults
  }
  else {
    const searchOptions: SearchLocationOptions = { fetchLimit: 500 }
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

    // Compute primary category for each location
    const locationCategories = new Map<string, string[]>()
    for (const location of filteredResults) {
      locationCategories.set(location.uuid, location.categories.map(c => c.id))
    }
    const primaryCategoryIds = await getMostSpecificCategoriesBatch(locationCategories)

    // Add primaryCategory to results
    for (const location of filteredResults) {
      const primaryCategoryId = primaryCategoryIds.get(location.uuid)
      if (primaryCategoryId) {
        location.primaryCategory = location.categories.find(c => c.id === primaryCategoryId)
      }
    }

    return filteredResults
  }
}

const cachedSearchHandler = defineCachedEventHandler(searchHandler, {
  maxAge: 60 * 60 * 24,
  getKey: (event) => {
    const query = getQuery(event)
    const categoriesKey = query.categories ? (Array.isArray(query.categories) ? query.categories.join(',') : query.categories) : ''
    return `search:${query.q}:${query.lat || ''}:${query.lng || ''}:${query.openNow || ''}:${query.nearMe || ''}:${categoriesKey}`
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

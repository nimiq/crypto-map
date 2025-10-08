import { consola } from 'consola'
import { toZonedTime } from 'date-fns-tz'
import { count, eq, inArray, sql } from 'drizzle-orm'
import OpeningHours from 'opening_hours'
import * as v from 'valibot'
import { locationSelect, searchLocationsByCategories, searchLocationsByText, searchSimilarCategories } from '../../utils/search'

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
  categories: v.optional(v.union([v.string(), v.array(v.string())])),
})

export default defineEventHandler(async (event) => {
  let { lat, lng, q: searchQuery, openNow = false, categories } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  const categoryIds = categories
    ? (Array.isArray(categories) ? categories : [categories])
    : []

  const db = useDrizzle()

  // Cloudflare adds IP geolocation in production (unavailable in dev)
  if (lat === undefined || lng === undefined) {
    const cfConnectingIp = getHeader(event, 'cf-connecting-ip')

    if (cfConnectingIp) {
      try {
        const location = await locateByHost(cfConnectingIp)
        lat = location.lat
        lng = location.lng
      }
      catch {
        // Non-blocking - search works without user location
      }
    }
  }

  // TODO: Use lat/lng for distance-based sorting
  if (lat !== undefined && lng !== undefined) {
    consola.info(`User location: ${lat}, ${lng} (not used for sorting yet)`, { tag: 'geolocation' })
  }

  const referenceTime = new Date()

  const filterOpenNow = <T extends {
    openingHours: Location['openingHours']
    timezone: Location['timezone']
    latitude: unknown
    longitude: unknown
  }>(locations: T[]) => {
    if (!openNow)
      return locations

    return locations.filter((loc) => {
      if (!loc.openingHours || !loc.timezone)
        return false

      try {
        const localDate = toZonedTime(referenceTime, loc.timezone)
        const schedule = new OpeningHours(loc.openingHours.trim())
        return schedule.getState(localDate)
      }
      catch {
        return false
      }
    })
  }

  // Show random results on page load for discovery
  if (!searchQuery || searchQuery.trim().length === 0) {
    const baseQueryBuilder = db
      .select(locationSelect)
      .from(tables.locations)
      .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
      .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
      .groupBy(tables.locations.uuid)

    let randomLocations
    if (categoryIds.length > 0) {
      // HAVING ensures location matches ALL selected categories (AND logic)
      const locationsWithCategories = db
        .select({ locationUuid: tables.locationCategories.locationUuid })
        .from(tables.locationCategories)
        .where(inArray(tables.locationCategories.categoryId, categoryIds))
        .groupBy(tables.locationCategories.locationUuid)
        .having(eq(count(), categoryIds.length))

      randomLocations = await baseQueryBuilder
        .where(
          inArray(tables.locations.uuid, sql`(${locationsWithCategories})`),
        )
        .orderBy(sql`RANDOM()`)
        .limit(10)
    }
    else {
      randomLocations = await baseQueryBuilder
        .orderBy(sql`RANDOM()`)
        .limit(10)
    }

    return filterOpenNow(randomLocations)
  }

  // Hybrid search: fast text search + smart semantic matching
  try {
    const textResults = await searchLocationsByText(searchQuery)

    const similarCategories = await searchSimilarCategories(searchQuery)
    const categoryResults = await searchLocationsByCategories(similarCategories)

    // Text results prioritized - they appear first in the list
    const combinedMap = new Map()

    for (const loc of textResults) {
      combinedMap.set(loc.uuid, loc)
    }

    // Category results added only if not already matched by text search
    for (const loc of categoryResults) {
      if (!combinedMap.has(loc.uuid)) {
        combinedMap.set(loc.uuid, loc)
      }
    }

    let searchResults = Array.from(combinedMap.values())

    // User-selected categories act as additional filter on search results
    if (categoryIds.length > 0) {
      searchResults = searchResults.filter((loc) => {
        if (!loc.categoryIds)
          return false
        const locCategoryIds = loc.categoryIds.split(',')
        return categoryIds.every(id => locCategoryIds.includes(id))
      })
    }

    return filterOpenNow(searchResults)
  }
  catch (error) {
    throw createError(error)
  }
})

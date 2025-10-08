import type { Location } from '../../shared/types'
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
  uuid: v.optional(v.string()), // Specific location UUID from autocomplete
  openNow: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  categories: v.optional(v.union([v.string(), v.array(v.string())])),
})


export default defineEventHandler(async (event): Promise<LocationResponse[]> => {
  const queryParams = getQuery(event)

  const result = v.safeParse(querySchema, queryParams)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: result.issues,
    })
  }

  let lat = result.output.lat
  let lng = result.output.lng
  const searchQuery = result.output.q
  const locationUuid = result.output.uuid
  const openNow = result.output.openNow ?? false
  const categoryIds = result.output.categories
    ? (Array.isArray(result.output.categories) ? result.output.categories : [result.output.categories])
    : []

  const db = useDrizzle()

  // User selected a specific location from autocomplete
  if (locationUuid) {
    const location = await db
      .select(locationSelect)
      .from(tables.locations)
      .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
      .where(eq(tables.locations.uuid, locationUuid))
      .groupBy(tables.locations.uuid)
      .limit(1)

    if (!location.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Location not found',
      })
    }

    const allCategories = await db.select().from(tables.categories)
    const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon }]))

    return location.map(loc => ({
      ...loc,
      categories: loc.categoryIds
        ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
        : [],
    }))
  }

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

    const allCategories = await db.select().from(tables.categories)
    const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon }]))

    const filteredLocations = filterOpenNow(randomLocations)

    return filteredLocations.map(loc => ({
      ...loc,
      categories: loc.categoryIds
        ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
        : [],
    }))
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

    const allCategories = await db.select().from(tables.categories)
    const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon }]))

    const filteredResults = filterOpenNow(searchResults)

    return filteredResults.map(loc => ({
      ...loc,
      categories: loc.categoryIds
        ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
        : [],
    }))
  }
  catch (error) {
    throw createError(error)
  }
})

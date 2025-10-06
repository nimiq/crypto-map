import type { Location } from '../../shared/types'
import { consola } from 'consola'
import { toZonedTime } from 'date-fns-tz'
import { eq, sql } from 'drizzle-orm'
import OpeningHours from 'opening_hours'
import * as v from 'valibot'

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
  categories: v.optional(v.string()),
})

export default defineEventHandler(async (event): Promise<LocationResponse[]> => {
  const query = getQuery(event)

  const result = v.safeParse(querySchema, query)

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
  const openNow = result.output.openNow ?? false
  const categoryIds = result.output.categories ? result.output.categories.split(',') : []

  // Try to get lat/lng from Cloudflare IP if not provided
  if (lat === undefined || lng === undefined) {
    const cfConnectingIp = getHeader(event, 'cf-connecting-ip')

    if (cfConnectingIp) {
      try {
        const location = await locateByHost(cfConnectingIp)
        lat = location.lat
        lng = location.lng
      }
      catch {
        // Silently continue without location
      }
    }
  }

  // TODO: Use lat/lng for distance-based sorting
  if (lat !== undefined && lng !== undefined) {
    consola.info(`User location: ${lat}, ${lng} (not used for sorting yet)`, { tag: 'geolocation' })
  }

  const db = useDrizzle()
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

  const filterByCategories = <T extends { categoryIds: string | null }>(locations: T[]) => {
    if (categoryIds.length === 0)
      return locations

    return locations.filter((loc) => {
      if (!loc.categoryIds)
        return false

      const locCategoryIds = loc.categoryIds.split(',')
      // Location must have ALL selected categories
      return categoryIds.every(catId => locCategoryIds.includes(catId))
    })
  }

  // If no search query, return 10 random locations
  if (!searchQuery || searchQuery.trim().length === 0) {
    const randomLocations = await db
      .select({
        uuid: tables.locations.uuid,
        name: tables.locations.name,
        address: tables.locations.address,
        latitude: sql<number>`ST_Y(${tables.locations.location})`.as('latitude'),
        longitude: sql<number>`ST_X(${tables.locations.location})`.as('longitude'),
        rating: tables.locations.rating,
        photo: tables.locations.photo,
        gmapsPlaceId: tables.locations.gmapsPlaceId,
        gmapsUrl: tables.locations.gmapsUrl,
        website: tables.locations.website,
        source: tables.locations.source,
        timezone: tables.locations.timezone,
        openingHours: tables.locations.openingHours,
        createdAt: tables.locations.createdAt,
        updatedAt: tables.locations.updatedAt,
        categoryIds: sql<string>`STRING_AGG(${tables.locationCategories.categoryId}, ',')`.as('categoryIds'),
      })
      .from(tables.locations)
      .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
      .groupBy(tables.locations.uuid)
      .orderBy(sql`RANDOM()`)
      .limit(10)

    // Get all categories once
    const allCategories = await db.select().from(tables.categories)
    const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon }]))

    const filteredLocations = filterByCategories(filterOpenNow(randomLocations))

    return filteredLocations.map(loc => ({
      ...loc,
      categories: loc.categoryIds
        ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
        : [],
    }))
  }

  // Search locations by name
  const searchResults = await db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: tables.locations.address,
      latitude: sql<number>`ST_Y(${tables.locations.location})`.as('latitude'),
      longitude: sql<number>`ST_X(${tables.locations.location})`.as('longitude'),
      rating: tables.locations.rating,
      photo: tables.locations.photo,
      gmapsPlaceId: tables.locations.gmapsPlaceId,
      gmapsUrl: tables.locations.gmapsUrl,
      website: tables.locations.website,
      source: tables.locations.source,
      timezone: tables.locations.timezone,
      openingHours: tables.locations.openingHours,
      createdAt: tables.locations.createdAt,
      updatedAt: tables.locations.updatedAt,
      categoryIds: sql<string>`STRING_AGG(${tables.locationCategories.categoryId}, ',')`.as('categoryIds'),
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .where(sql`${tables.locations.name} LIKE ${`%${searchQuery}%`}`)
    .groupBy(tables.locations.uuid)
    .limit(10)

  // Get all categories once
  const allCategories = await db.select().from(tables.categories)
  const categoryMap = new Map(allCategories.map(cat => [cat.id, { id: cat.id, name: cat.name, icon: cat.icon, createdAt: cat.createdAt }]))

  const filteredResults = filterByCategories(filterOpenNow(searchResults))

  return filteredResults.map(loc => ({
    ...loc,
    categories: loc.categoryIds
      ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
      : [],
  }))
})

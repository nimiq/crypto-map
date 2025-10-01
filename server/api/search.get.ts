import * as v from 'valibot'
import { eq } from 'drizzle-orm'

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
})

export default defineEventHandler(async (event) => {
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

  if (lat !== undefined && lng !== undefined) {
    console.log(`User location: ${lat}, ${lng} (not used for sorting yet)`)
  }

  const db = useDrizzle()

  // If no search query, return 10 random locations
  if (!searchQuery || searchQuery.trim().length === 0) {
    const randomLocations = await db
      .select({
        uuid: tables.locations.uuid,
        name: tables.locations.name,
        address: tables.locations.address,
        latitude: tables.locations.latitude,
        longitude: tables.locations.longitude,
        rating: tables.locations.rating,
        photo: tables.locations.photo,
        gmapsPlaceId: tables.locations.gmapsPlaceId,
        gmapsUrl: tables.locations.gmapsUrl,
        website: tables.locations.website,
        source: tables.locations.source,
        createdAt: tables.locations.createdAt,
        updatedAt: tables.locations.updatedAt,
        categories: sql<string>`GROUP_CONCAT(${tables.locationCategories.categoryId})`.as('categories'),
      })
      .from(tables.locations)
      .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
      .groupBy(tables.locations.uuid)
      .orderBy(sql`RANDOM()`)
      .limit(10)
      .all()

    return randomLocations.map(loc => ({
      ...loc,
      categories: loc.categories ? loc.categories.split(',') : [],
    }))
  }

  // Search locations by name
  const searchResults = await db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: tables.locations.address,
      latitude: tables.locations.latitude,
      longitude: tables.locations.longitude,
      rating: tables.locations.rating,
      photo: tables.locations.photo,
      gmapsPlaceId: tables.locations.gmapsPlaceId,
      gmapsUrl: tables.locations.gmapsUrl,
      website: tables.locations.website,
      source: tables.locations.source,
      createdAt: tables.locations.createdAt,
      updatedAt: tables.locations.updatedAt,
      categories: sql<string>`GROUP_CONCAT(${tables.locationCategories.categoryId})`.as('categories'),
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .where(sql`${tables.locations.name} LIKE ${`%${searchQuery}%`}`)
    .groupBy(tables.locations.uuid)
    .limit(10)
    .all()

  return searchResults.map(loc => ({
    ...loc,
    categories: loc.categories ? loc.categories.split(',') : [],
  }))
})

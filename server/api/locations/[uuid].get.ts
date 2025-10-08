import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'UUID is required',
    })
  }

  const db = useDrizzle()

  const result = await db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: tables.locations.address,
      latitude: sql<number>`ST_Y(${tables.locations.location})`,
      longitude: sql<number>`ST_X(${tables.locations.location})`,
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
      categories: sql`COALESCE(
        json_agg(
          json_build_object(
            'id', ${tables.categories.id},
            'name', ${tables.categories.name},
            'icon', ${tables.categories.icon}
          )
        ) FILTER (WHERE ${tables.categories.id} IS NOT NULL),
        '[]'
      )`,
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(eq(tables.locations.uuid, uuid))
    .groupBy(tables.locations.uuid)
    .limit(1)

  if (!result.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Location not found',
    })
  }

  return result[0]
})

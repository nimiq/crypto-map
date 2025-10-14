import * as v from 'valibot'

const querySchema = v.object({
  uuid: v.pipe(v.string(), v.uuid()),
})

export default defineCachedEventHandler(async (event) => {
  const { uuid } = await getValidatedRouterParams(event, data => v.parse(querySchema, data))

  const db = useDrizzle()

  const result = await db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: sql<string>`${tables.locations.street} || ', ' || ${tables.locations.postalCode} || ' ' || ${tables.locations.city} || ', ' || ${tables.locations.country}`,
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
    .then(rows => rows[0])

  if (!result)
    throw createError({ statusCode: 404, statusMessage: 'Location not found' })

  setResponseHeader(event, 'Cache-Control', 'public, max-age=900, stale-while-revalidate=900')

  return result
}, {
  maxAge: 60 * 15,
  swr: true,
  getKey: event => getRouterParam(event, 'uuid') || '',
})

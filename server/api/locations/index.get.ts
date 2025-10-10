import { eq, inArray, isNotNull, sql } from 'drizzle-orm'
import * as v from 'valibot'

const querySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '1'),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '50'),
  categoryId: v.optional(v.string()),
  status: v.optional(v.picklist(['open', 'popular'])),
  uuids: v.optional(v.pipe(v.string(), v.transform(s => s.split(',').filter(Boolean)))),
})

export default defineEventHandler(async (event) => {
  const result = await getValidatedQuery(event, data => v.safeParse(querySchema, data))
  const { page = 1, limit = 50, categoryId, status, uuids } = result.success ? result.output : {}

  const db = useDrizzle()
  const offset = (page - 1) * limit

  // Build base query
  let query = db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: tables.locations.address,
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
      latitude: sql<number>`ST_Y(${tables.locations.location})`,
      longitude: sql<number>`ST_X(${tables.locations.location})`,
      categories: sql<Array<{ id: string, name: string, icon: string }>>`
        COALESCE(
          json_agg(
            json_build_object(
              'id', ${tables.categories.id},
              'name', ${tables.categories.name},
              'icon', ${tables.categories.icon}
            )
          ) FILTER (WHERE ${tables.categories.id} IS NOT NULL),
          '[]'
        )
      `,
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .$dynamic()

  // Add WHERE conditions
  const whereConditions = []

  if (categoryId) {
    whereConditions.push(sql`${tables.locations.uuid} IN (
      SELECT ${tables.locationCategories.locationUuid}
      FROM ${tables.locationCategories}
      WHERE ${tables.locationCategories.categoryId} = ${categoryId}
    )`)
  }

  if (status === 'open')
    whereConditions.push(isNotNull(tables.locations.openingHours))
  else if (status === 'popular')
    whereConditions.push(isNotNull(tables.locations.rating))

  if (uuids && uuids.length > 0)
    whereConditions.push(inArray(tables.locations.uuid, uuids))

  if (whereConditions.length > 0)
    query = query.where(sql.join(whereConditions, sql` AND `))

  // Group by location
  query = query.groupBy(tables.locations.uuid)

  // Add ORDER BY
  if (categoryId || status)
    query = query.orderBy(sql`${tables.locations.rating} DESC NULLS LAST`)
  else
    query = query.orderBy(tables.locations.name)

  // Execute queries in parallel
  const [locations, totalCount] = await Promise.all([
    query.limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tables.locations).then(r => r[0]?.count || 0),
  ])

  // Apply runtime filters
  let filteredLocations = locations
  if (status === 'open')
    filteredLocations = filterOpenNow(locations as any)

  // Preserve order for uuids query
  if (uuids && uuids.length > 0) {
    const locationsMap = new Map(filteredLocations.map(loc => [loc.uuid, loc]))
    filteredLocations = uuids.map(uuid => locationsMap.get(uuid)).filter(Boolean) as typeof locations
  }

  return {
    locations: filteredLocations,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
})

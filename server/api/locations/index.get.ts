import { eq, inArray, isNotNull, sql } from 'drizzle-orm'
import * as v from 'valibot'

// Plan B Forum at Lugano Convention Centre (Palazzo dei Congressi)
const CONFERENCE_CENTER = { lat: 46.005030, lng: 8.956060 }

const querySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '1'),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '50'),
  categoryId: v.optional(v.string()),
  status: v.optional(v.picklist(['open', 'popular', 'contextual-primary', 'contextual-secondary'])),
  uuids: v.optional(v.pipe(v.string(), v.transform(s => s.split(',').filter(Boolean)))),
})

/**
 * Builds shared WHERE conditions for location queries
 */
function buildWhereConditions(options: { categoryId?: string, contextualCategories?: string[], status?: string, uuids?: string[] }) {
  const { categoryId, contextualCategories, status, uuids } = options
  const whereConditions = []

  if (categoryId) {
    whereConditions.push(sql`${tables.locations.uuid} IN (
      SELECT ${tables.locationCategories.locationUuid}
      FROM ${tables.locationCategories}
      WHERE ${tables.locationCategories.categoryId} = ${categoryId}
    )`)
  }

  if (contextualCategories && contextualCategories.length > 0)
    whereConditions.push(inArray(tables.locationCategories.categoryId, contextualCategories))

  if (status === 'open')
    whereConditions.push(isNotNull(tables.locations.openingHours))
  else if (status === 'popular')
    whereConditions.push(isNotNull(tables.locations.rating))
  else if (status === 'contextual-primary' || status === 'contextual-secondary')
    whereConditions.push(isNotNull(tables.locations.rating))

  if (uuids && uuids.length > 0)
    whereConditions.push(inArray(tables.locations.uuid, uuids))

  return whereConditions
}

export default defineEventHandler(async (event) => {
  const result = await getValidatedQuery(event, data => v.safeParse(querySchema, data))
  const { page = 1, limit = 50, categoryId, status, uuids } = result.success ? result.output : {}

  const db = useDrizzle()
  const offset = (page - 1) * limit

  // Handle contextual status by converting to category filtering
  let contextualCategories: string[] | undefined
  if (status === 'contextual-primary' || status === 'contextual-secondary') {
    const timeContext = getContextualCategories()
    const carousel = status === 'contextual-primary' ? timeContext.primary : timeContext.secondary
    contextualCategories = carousel.categories
  }

  // Build shared WHERE conditions
  const whereConditions = buildWhereConditions({ categoryId, contextualCategories, status, uuids })

  // Build base query
  let query = db
    .select({
      uuid: tables.locations.uuid,
      name: tables.locations.name,
      address: sql<string>`${tables.locations.street} || ', ' || ${tables.locations.postalCode} || ' ' || ${tables.locations.city} || ', ' || ${tables.locations.country}`,
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
      distanceMeters: sql<number>`ST_Distance(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${CONFERENCE_CENTER.lng}, ${CONFERENCE_CENTER.lat}), 4326)::geography
      )`,
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

  if (whereConditions.length > 0)
    query = query.where(sql.join(whereConditions, sql` AND `))

  query = query.groupBy(tables.locations.uuid)

  // Add ORDER BY
  if (categoryId || status)
    query = query.orderBy(sql`${tables.locations.rating} DESC NULLS LAST`)
  else
    query = query.orderBy(tables.locations.name)

  // Execute query (skip count for carousel/uuid queries as it's not needed and can timeout)
  const skipCount = Boolean(status || uuids)

  // Determine if we need runtime filtering for count accuracy
  const needsRuntimeFilter = status === 'open' || status === 'contextual-primary' || status === 'contextual-secondary'

  let locations: Awaited<typeof query>
  let totalCount: number

  if (skipCount) {
    // Skip count for carousel/uuid queries
    locations = await query.limit(limit).offset(offset)
    totalCount = 0
  }
  else if (needsRuntimeFilter) {
    // For openNow filtering: fetch all matching records (lightweight), filter runtime, then paginate
    const allLocations = await query
    const filteredAll = filterOpenNow(allLocations)
    totalCount = filteredAll.length
    locations = filteredAll.slice(offset, offset + limit)
  }
  else {
    // Standard path: count with same WHERE conditions
    let countQuery = db
      .select({ count: sql<number>`count(DISTINCT ${tables.locations.uuid})::int` })
      .from(tables.locations)
      .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
      .$dynamic()

    if (whereConditions.length > 0)
      countQuery = countQuery.where(sql.join(whereConditions, sql` AND `))

    const [locationsResult, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery.then(r => r[0]?.count || 0),
    ])

    locations = locationsResult
    totalCount = countResult
  }

  // Apply runtime filters to paginated results
  let filteredLocations = locations
  if (needsRuntimeFilter && !skipCount) {
    // Already filtered above for count accuracy, skip re-filtering
    filteredLocations = locations
  }
  else if (needsRuntimeFilter) {
    // For skipCount=true cases (carousels), still filter paginated results
    filteredLocations = filterOpenNow(locations)
  }

  // Preserve order for uuids query
  if (uuids && uuids.length > 0) {
    const locationsMap = new Map(filteredLocations.map(loc => [loc.uuid, loc]))
    filteredLocations = uuids.map(uuid => locationsMap.get(uuid)).filter(Boolean) as typeof locations
  }

  // Add contextual metadata if applicable
  let contextualMetadata
  if (status === 'contextual-primary' || status === 'contextual-secondary') {
    const timeContext = getContextualCategories()
    const carousel = status === 'contextual-primary' ? timeContext.primary : timeContext.secondary
    contextualMetadata = { title: carousel.title, icon: carousel.icon }
  }

  return {
    locations: filteredLocations,
    contextual: contextualMetadata,
    pagination: skipCount
      ? undefined
      : {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
  }
})

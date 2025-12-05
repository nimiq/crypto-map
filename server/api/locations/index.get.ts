import { eq, inArray, isNotNull, sql } from 'drizzle-orm'
import * as v from 'valibot'

// Plan B Forum at Lugano Convention Centre (Palazzo dei Congressi)
const CONFERENCE_CENTER = { lat: 46.00503, lng: 8.95606 }

const querySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '1'),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number()), '50'),
  categoryId: v.optional(v.string()),
  status: v.optional(
    v.picklist([
      'open',
      'popular',
      'contextual-primary',
      'contextual-secondary',
    ]),
  ),
  uuids: v.optional(
    v.pipe(
      v.string(),
      v.transform(s => s.split(',').filter(Boolean)),
    ),
  ),
})

/**
 * Builds shared WHERE conditions for location queries
 */
function buildWhereConditions(options: {
  categoryId?: string
  contextualCategories?: string[]
  status?: string
  uuids?: string[]
}) {
  const { categoryId, contextualCategories, status, uuids } = options
  const whereConditions = []

  if (categoryId) {
    whereConditions.push(categoryFilterOr([categoryId]))
  }

  if (contextualCategories && contextualCategories.length > 0)
    whereConditions.push(categoryFilterOr(contextualCategories))

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
  const result = await getValidatedQuery(event, data =>
    v.safeParse(querySchema, data))
  const {
    page = 1,
    limit = 50,
    categoryId,
    status,
    uuids,
  } = result.success ? result.output : {}

  const db = useDrizzle()
  const offset = (page - 1) * limit

  // Handle contextual status by converting to category filtering
  let contextualCategories: string[] | undefined
  if (status === 'contextual-primary' || status === 'contextual-secondary') {
    const timeContext = getContextualCategories()
    const carousel
      = status === 'contextual-primary'
        ? timeContext.primary
        : timeContext.secondary
    contextualCategories = carousel.categories
  }

  // Build shared WHERE conditions
  const whereConditions = buildWhereConditions({
    categoryId,
    contextualCategories,
    status,
    uuids,
  })

  // Build base query
  let query = db
    .select(locationSelectWithDistance(CONFERENCE_CENTER))
    .from(tables.locations)
    .leftJoin(
      tables.locationCategories,
      eq(tables.locations.uuid, tables.locationCategories.locationUuid),
    )
    .leftJoin(
      tables.categories,
      eq(tables.locationCategories.categoryId, tables.categories.id),
    )
    .$dynamic()

  if (whereConditions.length > 0)
    query = query.where(sql.join(whereConditions, sql` AND `))

  query = query.groupBy(
    tables.locations.uuid,
    tables.locations.name,
    tables.locations.street,
    tables.locations.city,
    tables.locations.postalCode,
    tables.locations.region,
    tables.locations.country,
    tables.locations.location,
    tables.locations.rating,
    tables.locations.ratingCount,
    tables.locations.gmapsPlaceId,
    tables.locations.gmapsUrl,
    tables.locations.website,
    tables.locations.source,
    tables.locations.timezone,
    tables.locations.openingHours,
    tables.locations.createdAt,
    tables.locations.updatedAt,
  )

  // Add ORDER BY
  if (status === 'contextual-primary' || status === 'contextual-secondary') {
    query = query.orderBy(sql`"distanceMeters" ASC`)
  }
  else if (categoryId || status) {
    query = query.orderBy(sql`${tables.locations.rating} DESC NULLS LAST`)
  }
  else {
    query = query.orderBy(tables.locations.name)
  }

  // Execute query (skip count for carousel/uuid queries as it's not needed and can timeout)
  const skipCount = Boolean(status || uuids)

  // Determine if we need runtime filtering for count accuracy
  const needsRuntimeFilter = status === 'open'

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
      .select({
        count: sql<number>`count(DISTINCT ${tables.locations.uuid})::int`,
      })
      .from(tables.locations)
      .leftJoin(
        tables.locationCategories,
        eq(tables.locations.uuid, tables.locationCategories.locationUuid),
      )
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
    const locationsMap = new Map(
      filteredLocations.map(loc => [loc.uuid, loc]),
    )
    filteredLocations = uuids
      .map(uuid => locationsMap.get(uuid))
      .filter(Boolean) as typeof locations
  }

  // Add contextual metadata if applicable
  let contextualMetadata
  if (status === 'contextual-primary' || status === 'contextual-secondary') {
    const timeContext = getContextualCategories()
    const carousel
      = status === 'contextual-primary'
        ? timeContext.primary
        : timeContext.secondary
    contextualMetadata = {
      title: carousel.title,
      icon: carousel.icon,
      categories: carousel.categories,
    }
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

// Lower threshold means more results, higher means more precise matches
const SIMILARITY_THRESHOLD = 0.7

const locationSelect = {
  uuid: tables.locations.uuid,
  name: tables.locations.name,
  address: sql<string>`${tables.locations.street} || ', ' || ${tables.locations.postalCode} || ' ' || ${tables.locations.city} || ', ' || ${tables.locations.country}`.as('address'),
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
  categories: sql<LocationResponse['categories']>`COALESCE(
    json_agg(
      json_build_object(
        'id', ${tables.categories.id},
        'name', ${tables.categories.name},
        'icon', ${tables.categories.icon}
      )
    ) FILTER (WHERE ${tables.categories.id} IS NOT NULL),
    '[]'
  )`.as('categories'),
}

// Combined semantic search: finds similar categories and their locations in a single query
export async function searchLocationsBySimilarCategories(
  query: string,
  options: SearchLocationOptions = {},
): Promise<LocationResponse[]> {
  try {
    const db = useDrizzle()
    const queryEmbedding = await generateEmbeddingCached(query)
    const { origin, maxDistanceMeters, categories, fetchLimit } = options
    const limit = fetchLimit && fetchLimit > 0 ? fetchLimit : 100

    // Build distance calculation and filter clauses
    const distanceSelect = origin
      ? sql`, ST_Distance(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography
      ) as "distanceMeters"`
      : sql``

    const distanceFilter = origin && maxDistanceMeters
      ? sql`AND ST_DWithin(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
        ${maxDistanceMeters}
      )`
      : sql``

    let categoryFilter = sql``
    if (categories && categories.length > 0) {
      const categoryConditions = categories.map(cat => sql`${tables.locationCategories.categoryId} = ${cat}`)
      categoryFilter = sql`AND ${tables.locations.uuid} IN (
        SELECT ${tables.locationCategories.locationUuid}
        FROM ${tables.locationCategories}
        WHERE ${sql.join(categoryConditions, sql` OR `)}
      )`
    }

    const orderByClause = origin
      ? sql`ORDER BY "distanceMeters"`
      : sql``

    // Single query using CTE to find similar categories and join to locations
    const result = await db.execute(sql`
    WITH similar_categories AS (
      SELECT ${tables.categories.id}
      FROM ${tables.categories}
      WHERE ${tables.categories.embedding} IS NOT NULL
        AND 1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${SIMILARITY_THRESHOLD}
      ORDER BY 1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) DESC
      LIMIT 5
    )
    SELECT
      ${tables.locations.uuid},
      ${tables.locations.name},
      ${tables.locations.street} || ', ' || ${tables.locations.postalCode} || ' ' || ${tables.locations.city} || ', ' || ${tables.locations.country} as address,
      ST_Y(${tables.locations.location}) as latitude,
      ST_X(${tables.locations.location}) as longitude,
      ${tables.locations.rating},
      ${tables.locations.photo},
      ${tables.locations.gmapsPlaceId} as "gmapsPlaceId",
      ${tables.locations.gmapsUrl} as "gmapsUrl",
      ${tables.locations.website},
      ${tables.locations.source},
      ${tables.locations.timezone},
      ${tables.locations.openingHours} as "openingHours",
      ${tables.locations.createdAt} as "createdAt",
      ${tables.locations.updatedAt} as "updatedAt",
      STRING_AGG(${tables.locationCategories.categoryId}, ',') as "categoryIds",
      COALESCE(
        json_agg(
          json_build_object(
            'id', ${tables.categories.id},
            'name', ${tables.categories.name},
            'icon', ${tables.categories.icon}
          )
        ) FILTER (WHERE ${tables.categories.id} IS NOT NULL),
        '[]'
      ) as categories
      ${distanceSelect}
    FROM ${tables.locations}
    INNER JOIN ${tables.locationCategories}
      ON ${tables.locations.uuid} = ${tables.locationCategories.locationUuid}
    INNER JOIN similar_categories
      ON ${tables.locationCategories.categoryId} = similar_categories.id
    LEFT JOIN ${tables.categories}
      ON ${tables.locationCategories.categoryId} = ${tables.categories.id}
    WHERE 1=1
      ${distanceFilter}
      ${categoryFilter}
    GROUP BY ${tables.locations.uuid}
    ${orderByClause}
    LIMIT ${limit}
  `)

    return ((result as any).rows || []) as LocationResponse[]
  }
  catch (error) {
    // If semantic search fails (e.g., missing OpenAI key), fall back to empty results
    // Text search will still work independently
    console.error('Semantic search failed:', error)
    return []
  }
}

// Fetch locations by categories only (no search query)
export async function searchLocationsByCategories(
  categories: string[],
  options: SearchLocationOptions = {},
): Promise<SearchLocationResponse[]> {
  const { origin, maxDistanceMeters, fetchLimit } = options
  const limit = fetchLimit && fetchLimit > 0 ? fetchLimit : 100

  const db = useDrizzle()
  const selectFields: Record<string, any> = {
    ...locationSelect,
    icon: sql<string>`(array_agg(${tables.categories.icon}) FILTER (WHERE ${tables.categories.icon} IS NOT NULL))[1]`.as('icon'),
  }

  // Add distance calculation if origin is provided
  if (origin) {
    selectFields.distanceMeters = sql<number>`
      ST_Distance(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography
      )
    `.as('distanceMeters')
  }

  const whereConditions = []

  // Add geospatial filter if origin and maxDistanceMeters are provided
  if (origin && maxDistanceMeters) {
    whereConditions.push(
      sql`ST_DWithin(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
        ${maxDistanceMeters}
      )`,
    )
  }

  // Add category filter
  const categoryConditions = categories.map(cat => sql`${tables.locationCategories.categoryId} = ${cat}`)
  whereConditions.push(
    sql`${tables.locations.uuid} IN (
      SELECT ${tables.locationCategories.locationUuid}
      FROM ${tables.locationCategories}
      WHERE ${sql.join(categoryConditions, sql` OR `)}
    )`,
  )

  const baseQuery = db
    .select(selectFields)
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(and(...whereConditions))
    .groupBy(tables.locations.uuid)

  // Order by distance if origin is provided, otherwise by rating
  const queryBuilder = origin
    ? baseQuery.orderBy(selectFields.distanceMeters)
    : baseQuery.orderBy(sql`${tables.locations.rating} DESC NULLS LAST`)

  return await queryBuilder.limit(limit) as SearchLocationResponse[]
}

// PostgreSQL's built-in FTS is faster than vector search for exact/prefix matches
export async function searchLocationsByText(
  query: string,
  options: SearchLocationOptions = {},
): Promise<SearchLocationResponse[]> {
  const tsQuery = query.trim().split(/\s+/).join(' & ')
  const { origin, maxDistanceMeters, categories, fetchLimit } = options
  const limit = fetchLimit && fetchLimit > 0 ? fetchLimit : 100

  const db = useDrizzle()
  const selectFields: Record<string, any> = {
    ...locationSelect,
    highlightedName: sql<string>`ts_headline('simple', ${tables.locations.name}, to_tsquery('simple', ${tsQuery}), 'StartSel=<mark>, StopSel=</mark>')`.as('highlightedName'),
    icon: sql<string>`(array_agg(${tables.categories.icon}) FILTER (WHERE ${tables.categories.icon} IS NOT NULL))[1]`.as('icon'),
  }

  // Add distance calculation if origin is provided
  if (origin) {
    selectFields.distanceMeters = sql<number>`
      ST_Distance(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography
      )
    `.as('distanceMeters')
  }

  const whereConditions = [
    sql`to_tsvector('simple', ${tables.locations.name} || ' ' || ${tables.locations.street} || ' ' || ${tables.locations.city} || ' ' || ${tables.locations.country})
        @@ to_tsquery('simple', ${tsQuery})`,
  ]

  // Add geospatial filter if origin and maxDistanceMeters are provided
  if (origin && maxDistanceMeters) {
    whereConditions.push(
      sql`ST_DWithin(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
        ${maxDistanceMeters}
      )`,
    )
  }

  // Add category filter if categories are provided
  if (categories && categories.length > 0) {
    const categoryConditions = categories.map(cat => sql`${tables.locationCategories.categoryId} = ${cat}`)
    whereConditions.push(
      sql`${tables.locations.uuid} IN (
        SELECT ${tables.locationCategories.locationUuid}
        FROM ${tables.locationCategories}
        WHERE ${sql.join(categoryConditions, sql` OR `)}
      )`,
    )
  }

  const baseQuery = db
    .select(selectFields)
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(and(...whereConditions))
    .groupBy(tables.locations.uuid)

  // Order by distance if origin is provided, otherwise no explicit ordering
  const queryBuilder = origin
    ? baseQuery.orderBy(selectFields.distanceMeters)
    : baseQuery

  return await queryBuilder.limit(limit) as SearchLocationResponse[]
}

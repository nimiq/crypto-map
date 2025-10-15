// Lower threshold means more results, higher means more precise matches
const SIMILARITY_THRESHOLD = 0.3
const SEMANTIC_CATEGORY_LIMIT = 5

const KEYWORD_FALLBACKS: Array<{ keywords: string[], categories: string[] }> = [
  { keywords: ['restaurant', 'food', 'eat', 'dining'], categories: ['restaurant', 'food_store', 'bar', 'cafe', 'bakery'] },
  { keywords: ['coffee', 'cafe'], categories: ['cafe', 'coffee_shop'] },
  { keywords: ['bar', 'drink'], categories: ['bar'] },
  { keywords: ['shop', 'store'], categories: ['store', 'clothing_store', 'food_store'] },
  { keywords: ['hotel', 'stay', 'lodging'], categories: ['lodging'] },
]

function pickFallbackCategories(query: string): string[] {
  const normalized = query.toLowerCase()
  for (const fallback of KEYWORD_FALLBACKS) {
    if (fallback.keywords.some(keyword => normalized.includes(keyword)))
      return fallback.categories
  }

  return []
}

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
): Promise<SearchLocationResponse[]> {
  try {
    const db = useDrizzle()
    const queryEmbedding = await generateEmbeddingCached(query)
    const { origin, maxDistanceMeters, categories: requiredCategories, fetchLimit, page, limit: pageLimit } = options

    const vectorMatches = await db.execute(sql`
      SELECT ${tables.categories.id} as id
      FROM ${tables.categories}
      WHERE ${tables.categories.embedding} IS NOT NULL
        AND 1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${SIMILARITY_THRESHOLD}
      ORDER BY 1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) DESC
      LIMIT ${SEMANTIC_CATEGORY_LIMIT}
    `)

    let categoryIds = ((vectorMatches as any).rows || []).map((row: any) => row.id as string)

    if (categoryIds.length === 0)
      categoryIds = pickFallbackCategories(query)

    if (categoryIds.length === 0)
      return []

    const semanticResults = await searchLocationsByCategories(
      categoryIds,
      {
        origin,
        maxDistanceMeters,
        fetchLimit,
        page,
        limit: pageLimit,
      },
    )

    if (requiredCategories && requiredCategories.length > 0) {
      return semanticResults.filter((location) => {
        const locationCategorySet = new Set((location.categoryIds ?? '').split(',').filter(Boolean))
        return requiredCategories.every(cat => locationCategorySet.has(cat))
      })
    }

    return semanticResults
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
  const { origin, maxDistanceMeters, fetchLimit, page = 1, limit: pageLimit = 20 } = options

  const limit = fetchLimit && fetchLimit > 0 ? fetchLimit : pageLimit
  const offset = fetchLimit ? 0 : (page - 1) * pageLimit

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

  return await queryBuilder.limit(limit).offset(offset) as SearchLocationResponse[]
}

// PostgreSQL's built-in FTS is faster than vector search for exact/prefix matches
export async function searchLocationsByText(
  query: string,
  options: SearchLocationOptions = {},
): Promise<SearchLocationResponse[]> {
  const originalQuery = query.trim()
  if (!originalQuery)
    return []

  const tsQuery = originalQuery.split(/\s+/).join(' & ')
  const singularQuery = originalQuery.replace(/s\b/g, '').trim()
  const fallbackTsQuery = singularQuery && singularQuery !== originalQuery
    ? singularQuery.split(/\s+/).join(' & ')
    : null

  const { origin, maxDistanceMeters, categories, fetchLimit, page = 1, limit: pageLimit = 20 } = options

  const limit = fetchLimit && fetchLimit > 0 ? fetchLimit : pageLimit
  const offset = fetchLimit ? 0 : (page - 1) * pageLimit

  const db = useDrizzle()
  const selectFields: Record<string, any> = {
    ...locationSelect,
    highlightedName: sql<string>`ts_headline('english', ${tables.locations.name}, to_tsquery('english', ${tsQuery}), 'StartSel=<mark>, StopSel=</mark>')`.as('highlightedName'),
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

  const searchVector = sql`to_tsvector('english', ${tables.locations.name} || ' ' || ${tables.locations.street} || ' ' || ${tables.locations.city} || ' ' || ${tables.locations.country})`
  const textMatch = fallbackTsQuery
    ? sql`(${searchVector} @@ to_tsquery('english', ${tsQuery}) OR ${searchVector} @@ to_tsquery('english', ${fallbackTsQuery}))`
    : sql`${searchVector} @@ to_tsquery('english', ${tsQuery})`

  const whereConditions = [textMatch]

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

  return await queryBuilder.limit(limit).offset(offset) as SearchLocationResponse[]
}

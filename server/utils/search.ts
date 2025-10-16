import type { SearchLocationOptions, SearchLocationResponse } from '../../shared/types'
import { and, eq, sql, tables, useDrizzle } from './drizzle'
import { generateEmbeddingCached } from './embeddings'
import {
  baseLocationSelect,
  categoryFilterOr,
  distance,
  withinDistance,
} from './sql-fragments'

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
  ...baseLocationSelect,
  categoryIds: sql<string>`STRING_AGG(${tables.locationCategories.categoryId}, ',')`.as('categoryIds'),
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
    selectFields.distanceMeters = distance(origin)
  }

  const whereConditions = []

  // Add geospatial filter if origin and maxDistanceMeters are provided
  if (origin && maxDistanceMeters) {
    whereConditions.push(withinDistance(origin, maxDistanceMeters))
  }

  // Add category filter
  whereConditions.push(categoryFilterOr(categories))

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

  // Sanitize query for PostgreSQL tsquery - remove special characters and normalize whitespace
  // PostgreSQL tsquery syntax doesn't allow consecutive operators or special chars like &, |, !, ()
  const sanitizedQuery = originalQuery
    .replace(/[&|!()]/g, ' ') // Remove tsquery special characters that cause syntax errors
    .replace(/\s+/g, ' ') // Normalize whitespace to prevent empty terms
    .trim()

  if (!sanitizedQuery)
    return []

  const tsQuery = sanitizedQuery.split(/\s+/).join(' & ')
  const singularQuery = sanitizedQuery.replace(/s\b/g, '').trim()
  const fallbackTsQuery = singularQuery && singularQuery !== sanitizedQuery
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
    selectFields.distanceMeters = distance(origin)
  }

  const searchVector = sql`to_tsvector('english', ${tables.locations.name} || ' ' || ${tables.locations.street} || ' ' || ${tables.locations.city} || ' ' || ${tables.locations.country})`
  const textMatch = fallbackTsQuery
    ? sql`(${searchVector} @@ to_tsquery('english', ${tsQuery}) OR ${searchVector} @@ to_tsquery('english', ${fallbackTsQuery}))`
    : sql`${searchVector} @@ to_tsquery('english', ${tsQuery})`

  const whereConditions = [textMatch]

  // Add geospatial filter if origin and maxDistanceMeters are provided
  if (origin && maxDistanceMeters) {
    whereConditions.push(withinDistance(origin, maxDistanceMeters))
  }

  // Add category filter if categories are provided
  if (categories && categories.length > 0) {
    whereConditions.push(categoryFilterOr(categories))
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

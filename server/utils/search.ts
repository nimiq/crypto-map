import type { LocationResponse, SearchLocationResponse } from '../../shared/types'
import { eq, inArray, sql } from 'drizzle-orm'
import { generateEmbeddingCached } from './embeddings'

// Lower threshold means more results, higher means more precise matches
const SIMILARITY_THRESHOLD = 0.7

const locationSelect = {
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

// Enables semantic search - "coffee shop" matches "cafe" even without exact text match
export async function searchSimilarCategories(query: string): Promise<string[]> {
  const db = useDrizzle()

  const queryEmbedding = await generateEmbeddingCached(query)

  const results = await db
    .select({
      id: tables.categories.id,
      similarity: sql<number>`1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`.as('similarity'),
    })
    .from(tables.categories)
    .where(sql`${tables.categories.embedding} IS NOT NULL`)
    .having(sql`1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${SIMILARITY_THRESHOLD}`)
    .orderBy(sql`similarity DESC`)
    .limit(5)

  return results.map(r => r.id)
}

// PostgreSQL's built-in FTS is faster than vector search for exact/prefix matches
export async function searchLocationsByText(query: string): Promise<SearchLocationResponse[]> {
  const tsQuery = query.trim().split(/\s+/).join(' & ')

  return await useDrizzle()
    .select({
      ...locationSelect,
      highlightedName: sql<string>`ts_headline('english', ${tables.locations.name}, to_tsquery('english', ${tsQuery}), 'StartSel=<mark>, StopSel=</mark>')`.as('highlightedName'),
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(sql`
      to_tsvector('english', ${tables.locations.name} || ' ' || ${tables.locations.address})
      @@ to_tsquery('english', ${tsQuery})
    `)
    .groupBy(tables.locations.uuid)
    .limit(10)
}

// Used in hybrid search to find locations matching semantically similar categories
export async function searchLocationsByCategories(categoryIds: string[]): Promise<LocationResponse[]> {
  if (categoryIds.length === 0)
    return []

  return await useDrizzle()
    .select(locationSelect)
    .from(tables.locations)
    .innerJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
    .where(inArray(tables.locationCategories.categoryId, categoryIds))
    .groupBy(tables.locations.uuid)
    .limit(10)
}

import { eq, inArray, sql } from 'drizzle-orm'
import { generateEmbeddingCached } from './embeddings'

const SIMILARITY_THRESHOLD = 0.7 // Categories with similarity >= 0.7

// Common select for location queries
export const locationSelect = {
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
}

/**
 * Search for similar categories using vector embeddings
 */
export async function searchSimilarCategories(query: string): Promise<string[]> {
  const db = useDrizzle()

  // Generate embedding for the query (cached)
  const queryEmbedding = await generateEmbeddingCached(query)

  // Find similar categories using cosine similarity
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

/**
 * Search locations using PostgreSQL full-text search
 * With ts_headline for highlighting matches
 */
export async function searchLocationsByText(query: string) {
  const db = useDrizzle()

  // Create a tsquery from the search string
  const tsQuery = query.trim().split(/\s+/).join(' & ')

  return await db
    .select({
      ...locationSelect,
      highlightedName: sql<string>`ts_headline('english', ${tables.locations.name}, to_tsquery('english', ${tsQuery}), 'StartSel=<mark>, StopSel=</mark>')`.as('highlightedName'),
    })
    .from(tables.locations)
    .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .where(sql`
      to_tsvector('english', ${tables.locations.name} || ' ' || ${tables.locations.address})
      @@ to_tsquery('english', ${tsQuery})
    `)
    .groupBy(tables.locations.uuid)
    .limit(10)
}

/**
 * Search locations by category IDs
 */
export async function searchLocationsByCategories(categoryIds: string[]) {
  if (categoryIds.length === 0)
    return []

  const db = useDrizzle()

  return await db
    .select(locationSelect)
    .from(tables.locations)
    .innerJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
    .where(inArray(tables.locationCategories.categoryId, categoryIds))
    .groupBy(tables.locations.uuid)
    .limit(10)
}

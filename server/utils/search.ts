import type { LocationResponse, SearchLocationResponse } from '../../shared/types'
import { eq, sql } from 'drizzle-orm'
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

// Combined semantic search: finds similar categories and their locations in a single query
export async function searchLocationsBySimilarCategories(query: string): Promise<LocationResponse[]> {
  const db = useDrizzle()
  const queryEmbedding = await generateEmbeddingCached(query)

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
      ${tables.locations.address},
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
    FROM ${tables.locations}
    INNER JOIN ${tables.locationCategories}
      ON ${tables.locations.uuid} = ${tables.locationCategories.locationUuid}
    INNER JOIN similar_categories
      ON ${tables.locationCategories.categoryId} = similar_categories.id
    LEFT JOIN ${tables.categories}
      ON ${tables.locationCategories.categoryId} = ${tables.categories.id}
    GROUP BY ${tables.locations.uuid}
    LIMIT 10
  `)

  return (result as any).rows as LocationResponse[]
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

// Filter locations by walkable distance (1500m) from user location using PostGIS
export function filterByWalkableDistance<T extends { latitude: number, longitude: number }>(
  locations: T[],
  userLat: number,
  userLng: number,
): T[] {
  const MAX_WALKABLE_DISTANCE_METERS = 1500

  return locations.filter((loc) => {
    // Haversine formula for distance calculation (approximate but fast)
    const R = 6371000 // Earth radius in meters
    const dLat = (loc.latitude - userLat) * Math.PI / 180
    const dLng = (loc.longitude - userLng) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(userLat * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180)
      * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance <= MAX_WALKABLE_DISTANCE_METERS
  })
}

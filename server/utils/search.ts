import type { LocationResponse } from '../../shared/types'
import { consola } from 'consola'
import { eq, sql } from 'drizzle-orm'
import { tables } from './drizzle'
import { useEmbeddingService } from './embedding'

/**
 * Configuration for search operations
 */
interface SearchConfig {
  keywordSearchLimit: number
  vectorSearchLimit: number
  hybridThreshold: number
  similarityThreshold: number
}

/**
 * Default search configuration
 */
const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  keywordSearchLimit: 10,
  vectorSearchLimit: 10,
  hybridThreshold: 5,
  similarityThreshold: 0.7,
}

/**
 * Internal location result structure from database queries
 */
interface LocationQueryResult {
  uuid: string
  name: string
  address: string
  latitude: number
  longitude: number
  rating: number | null
  photo: string | null
  gmapsPlaceId: string
  gmapsUrl: string
  website: string | null
  source: 'naka' | 'bluecode'
  timezone: string | null
  openingHours: string | null
  createdAt: Date | null
  updatedAt: Date | null
  categoryIds: string | null
  similarity?: number
}

/**
 * Search service for implementing hybrid search functionality
 */
export class SearchService {
  private config: SearchConfig

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config }
  }

  /**
   * Perform keyword-based search using LIKE query
   */
  async keywordSearch(query: string, limit: number = this.config.keywordSearchLimit): Promise<LocationQueryResult[]> {
    const db = useDrizzle()

    try {
      const results = await db
        .select({
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
        })
        .from(tables.locations)
        .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
        .where(sql`${tables.locations.name} LIKE ${`%${query}%`}`)
        .groupBy(tables.locations.uuid)
        .limit(limit)

      return results
    }
    catch (error) {
      consola.error('Keyword search failed:', error)
      throw new Error('Keyword search operation failed')
    }
  }

  /**
   * Perform vector-based similarity search using embeddings
   */
  async vectorSearch(query: string, limit: number = this.config.vectorSearchLimit): Promise<LocationQueryResult[]> {
    const db = useDrizzle()

    try {
      // Generate embedding for the search query
      const embeddingService = useEmbeddingService()
      const queryEmbedding = await embeddingService.generateEmbedding(query)

      // Perform vector similarity search
      const results = await db
        .select({
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
          similarity: sql<number>`1 - (${tables.locations.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`.as('similarity'),
        })
        .from(tables.locations)
        .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
        .where(sql`${tables.locations.embedding} IS NOT NULL`)
        .groupBy(tables.locations.uuid, tables.locations.embedding)
        .having(sql`1 - (${tables.locations.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${this.config.similarityThreshold}`)
        .orderBy(sql`1 - (${tables.locations.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) DESC`)
        .limit(limit)

      consola.info(`Vector search completed successfully, found ${results.length} results`)
      return results
    }
    catch (error) {
      // Log specific error types for better debugging
      if (error instanceof Error) {
        if (error.message.includes('OpenAI API key')) {
          consola.warn('Vector search skipped: OpenAI API key not configured')
        }
        else if (error.message.includes('OpenAI authentication')) {
          consola.warn('Vector search skipped: OpenAI authentication failed')
        }
        else if (error.message.includes('vector')) {
          consola.warn('Vector search skipped: Vector database operation failed')
        }
        else if (error.message.includes('pgvector')) {
          consola.warn('Vector search skipped: pgvector extension not available')
        }
        else {
          consola.error('Vector search failed with unexpected error:', error.message)
        }
      }
      else {
        consola.error('Vector search failed:', error)
      }

      // Don't throw error - let hybrid search fall back to keyword only
      return []
    }
  }

  /**
   * Perform hybrid search combining keyword and vector search
   */
  async hybridSearch(query: string): Promise<LocationQueryResult[]> {
    try {
      // First, perform keyword search
      const keywordResults = await this.keywordSearch(query)

      // If we have enough keyword results, return them
      if (keywordResults.length >= this.config.hybridThreshold) {
        consola.info(`Keyword search returned ${keywordResults.length} results, skipping vector search`)
        return keywordResults
      }

      // Supplement with vector search
      consola.info(`Keyword search returned ${keywordResults.length} results, supplementing with vector search`)
      const vectorResults = await this.vectorSearch(query)

      // Merge and deduplicate results
      const mergedResults = this.mergeAndDeduplicateResults(keywordResults, vectorResults)
      consola.info(`Hybrid search completed: ${keywordResults.length} keyword + ${vectorResults.length} vector = ${mergedResults.length} total results`)

      return mergedResults
    }
    catch (error) {
      consola.error('Hybrid search failed, falling back to keyword search:', error)

      // Attempt fallback to keyword search only
      try {
        const fallbackResults = await this.keywordSearch(query)
        consola.info(`Fallback keyword search completed with ${fallbackResults.length} results`)
        return fallbackResults
      }
      catch (fallbackError) {
        consola.error('Both hybrid and keyword fallback searches failed:', fallbackError)
        throw new Error('Search operation failed completely')
      }
    }
  }

  /**
   * Merge and deduplicate search results, prioritizing keyword matches
   */
  private mergeAndDeduplicateResults(
    keywordResults: LocationQueryResult[],
    vectorResults: LocationQueryResult[],
  ): LocationQueryResult[] {
    // Create a map to track seen UUIDs and prioritize keyword results
    const resultMap = new Map<string, LocationQueryResult>()

    // Add keyword results first (higher priority)
    for (const result of keywordResults) {
      resultMap.set(result.uuid, result)
    }

    // Add vector results that aren't already present
    for (const result of vectorResults) {
      if (!resultMap.has(result.uuid)) {
        resultMap.set(result.uuid, result)
      }
    }

    // Convert back to array and limit to reasonable size
    const mergedResults = Array.from(resultMap.values())

    // Sort results: keyword results first (no similarity score), then by similarity score
    mergedResults.sort((a, b) => {
      // Keyword results (no similarity score) come first
      if (a.similarity === undefined && b.similarity !== undefined)
        return -1
      if (a.similarity !== undefined && b.similarity === undefined)
        return 1

      // Both are keyword results or both are vector results
      if (a.similarity !== undefined && b.similarity !== undefined) {
        return b.similarity - a.similarity // Higher similarity first
      }

      // Both are keyword results, maintain original order
      return 0
    })

    // Limit to maximum reasonable number of results
    return mergedResults.slice(0, this.config.keywordSearchLimit)
  }

  /**
   * Convert internal query results to LocationResponse format
   */
  async formatResults(results: LocationQueryResult[]): Promise<LocationResponse[]> {
    if (results.length === 0) {
      return []
    }

    try {
      // Get all categories once for efficiency
      const db = useDrizzle()
      const allCategories = await db.select().from(tables.categories)
      const categoryMap = new Map(allCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
      })).map(cat => [cat.id, cat]))

      // Format results
      return results.map(loc => ({
        uuid: loc.uuid,
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        rating: loc.rating,
        photo: loc.photo,
        gmapsPlaceId: loc.gmapsPlaceId,
        gmapsUrl: loc.gmapsUrl,
        website: loc.website,
        source: loc.source,
        timezone: loc.timezone || 'UTC',
        openingHours: loc.openingHours,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
        categoryIds: loc.categoryIds || '',
        categories: loc.categoryIds
          ? loc.categoryIds.split(',').map(id => categoryMap.get(id)!).filter(Boolean)
          : [],
      }))
    }
    catch (error) {
      consola.error('Failed to format search results:', error)
      throw new Error('Failed to format search results')
    }
  }
}

/**
 * Create and return a singleton search service instance
 */
let searchServiceInstance: SearchService | null = null

export function useSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService()
  }
  return searchServiceInstance
}

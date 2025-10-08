import type { CategoryResponse } from '../../shared/types'
import { sql } from 'drizzle-orm'
import { tables, useDrizzle } from './drizzle'
import { generateEmbedding } from './embeddings'

/**
 * Performs keyword-based search on categories using ILIKE query
 * @param query - The search query string
 * @param limit - Maximum number of results to return (optional)
 * @returns Promise<CategoryResponse[]> - Array of matching categories
 */
export async function keywordSearchCategories(
  query: string,
  limit?: number,
): Promise<CategoryResponse[]> {
  const db = useDrizzle()

  const baseQuery = db
    .select({
      id: tables.categories.id,
      name: tables.categories.name,
      icon: tables.categories.icon,
    })
    .from(tables.categories)
    .where(sql`${tables.categories.name} ILIKE ${`%${query}%`}`)
    .orderBy(tables.categories.name)

  const categoriesFromDb = limit
    ? await baseQuery.limit(limit)
    : await baseQuery

  return categoriesFromDb.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
  }))
}

/**
 * Performs vector-based similarity search on categories using embeddings
 * @param query - The search query string
 * @param limit - Maximum number of results to return (default: 10)
 * @param similarityThreshold - Minimum similarity score (default: 0.8)
 * @returns Promise<CategoryResponse[]> - Array of matching categories ordered by similarity
 */
export async function vectorSearchCategories(
  query: string,
  limit: number = 10,
  similarityThreshold: number = 0.8,
): Promise<CategoryResponse[]> {
  try {
    // Generate embedding for the search query using AI SDK
    const queryEmbedding = await generateEmbedding(query)

    const db = useDrizzle()

    // Perform vector similarity search using pgvector cosine similarity operator
    // Note: pgvector uses <=> for cosine distance (lower is more similar)
    const categoriesFromDb = await db
      .select({
        id: tables.categories.id,
        name: tables.categories.name,
        icon: tables.categories.icon,
        similarity: sql<number>`1 - (${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`.as('similarity'),
      })
      .from(tables.categories)
      .where(sql`${tables.categories.embedding} IS NOT NULL`)
      .orderBy(sql`${tables.categories.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
      .limit(limit)

    // Filter results by similarity threshold and map to CategoryResponse format
    return categoriesFromDb
      .filter(cat => cat.similarity >= similarityThreshold)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
      }))
  }
  catch (error) {
    // Log error and return empty array for graceful fallback
    console.error('Vector search failed:', error)
    return []
  }
}

/**
 * Configuration for hybrid search behavior
 */
interface HybridSearchConfig {
  keywordSearchLimit: number
  vectorSearchLimit: number
  hybridThreshold: number
  similarityThreshold: number
}

/**
 * Default configuration for hybrid search
 */
const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  keywordSearchLimit: 10,
  vectorSearchLimit: 10,
  hybridThreshold: 5,
  similarityThreshold: 0.8,
}

/**
 * Performs hybrid search combining keyword and vector search with intelligent fallbacks
 * @param query - The search query string
 * @param config - Optional configuration for search behavior
 * @returns Promise<CategoryResponse[]> - Array of matching categories with keyword results prioritized
 */
export async function hybridSearchCategories(
  query: string,
  config: Partial<HybridSearchConfig> = {},
): Promise<CategoryResponse[]> {
  const searchConfig = { ...DEFAULT_HYBRID_CONFIG, ...config }

  try {
    // Step 1: Perform keyword search first
    const keywordResults = await keywordSearchCategories(query, searchConfig.keywordSearchLimit)

    // Step 2: Check if keyword results meet the threshold
    if (keywordResults.length >= searchConfig.hybridThreshold) {
      // Sufficient keyword results, return them directly
      return keywordResults
    }

    // Step 3: Supplement with vector search
    let vectorResults: CategoryResponse[] = []
    try {
      vectorResults = await vectorSearchCategories(
        query,
        searchConfig.vectorSearchLimit,
        searchConfig.similarityThreshold,
      )
    }
    catch (error) {
      // Log vector search error but continue with keyword results
      console.error('Vector search failed in hybrid search:', error)
    }

    // Step 4: Merge and deduplicate results
    const mergedResults = mergeAndDeduplicateResults(keywordResults, vectorResults)

    return mergedResults
  }
  catch (error) {
    // If keyword search fails, try vector search as fallback
    console.error('Keyword search failed in hybrid search:', error)

    try {
      return await vectorSearchCategories(
        query,
        searchConfig.vectorSearchLimit,
        searchConfig.similarityThreshold,
      )
    }
    catch (vectorError) {
      // Both searches failed, log error and return empty array
      console.error('Both keyword and vector search failed:', vectorError)
      return []
    }
  }
}

/**
 * Merges and deduplicates search results, prioritizing keyword matches
 * @param keywordResults - Results from keyword search
 * @param vectorResults - Results from vector search
 * @returns CategoryResponse[] - Merged and deduplicated results
 */
function mergeAndDeduplicateResults(
  keywordResults: CategoryResponse[],
  vectorResults: CategoryResponse[],
): CategoryResponse[] {
  // Create a Set to track category IDs we've already included
  const seenIds = new Set<string>()
  const mergedResults: CategoryResponse[] = []

  // Step 1: Add all keyword results first (they have priority)
  for (const category of keywordResults) {
    if (!seenIds.has(category.id)) {
      seenIds.add(category.id)
      mergedResults.push(category)
    }
  }

  // Step 2: Add vector results that aren't already included
  for (const category of vectorResults) {
    if (!seenIds.has(category.id)) {
      seenIds.add(category.id)
      mergedResults.push(category)
    }
  }

  return mergedResults
}

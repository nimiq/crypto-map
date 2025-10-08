import * as v from 'valibot'
import { hybridSearchCategories, keywordSearchCategories } from '../utils/category-search'

const querySchema = v.object({
  q: v.optional(v.string()),
})

export default defineEventHandler(async (event): Promise<CategoryResponse[]> => {
  const query = getQuery(event)

  const result = v.safeParse(querySchema, query)

  if (!result.success) {
    console.error('Invalid query parameters for categories search:', result.issues)
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
      data: result.issues,
    })
  }

  const { q: searchQuery } = result.output

  if (searchQuery) {
    try {
      console.warn(`Performing hybrid search for categories with query: "${searchQuery}"`)
      const searchResults = await hybridSearchCategories(searchQuery)
      console.warn(`Hybrid search returned ${searchResults.length} results for query: "${searchQuery}"`)
      return searchResults
    }
    catch (error) {
      // Log the error and implement graceful fallback to keyword-only search
      console.error('Hybrid search failed, falling back to keyword search:', error)

      try {
        const fallbackResults = await keywordSearchCategories(searchQuery)
        console.warn(`Keyword fallback search returned ${fallbackResults.length} results for query: "${searchQuery}"`)
        return fallbackResults
      }
      catch (fallbackError) {
        // If both hybrid and keyword search fail, log error and throw
        console.error('Both hybrid and keyword search failed for categories:', fallbackError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Category search temporarily unavailable',
        })
      }
    }
  }

  // Return all categories when no search query is provided
  try {
    console.warn('Fetching all categories (no search query provided)')
    const db = useDrizzle()
    const categoriesFromDb = await db.select({
      id: tables.categories.id,
      name: tables.categories.name,
      icon: tables.categories.icon,
    }).from(tables.categories)

    const allCategories = categoriesFromDb.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
    }))

    console.warn(`Returned ${allCategories.length} total categories`)
    return allCategories
  }
  catch (error) {
    console.error('Failed to fetch all categories:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch categories',
    })
  }
})

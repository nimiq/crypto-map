import { consola } from 'consola'
import * as v from 'valibot'
import { getMostSpecificCategoriesBatch } from '../../utils/category-hierarchy'
import { generateEmbeddingCached } from '../../utils/embeddings'
import { searchLocationsByText } from '../../utils/search'

const querySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
})

export default defineCachedEventHandler(async (event) => {
  const { q: searchQuery } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  // Precompute embedding in background (non-blocking)
  // waitUntil ensures the task completes even after response is sent
  event.waitUntil(
    generateEmbeddingCached(searchQuery).catch((error) => {
      consola.error('Failed to cache embedding:', error, { tag: 'autocomplete' })
    }),
  )

  const results = await searchLocationsByText(searchQuery, { fetchLimit: 10 })

  // Compute primary category for each location
  const locationCategories = new Map<string, string[]>()
  for (const location of results) {
    locationCategories.set(location.uuid, location.categories.map(c => c.id))
  }
  const primaryCategoryIds = await getMostSpecificCategoriesBatch(locationCategories)

  // Add primaryCategory to results
  for (const location of results) {
    const primaryCategoryId = primaryCategoryIds.get(location.uuid)
    if (primaryCategoryId) {
      location.primaryCategory = location.categories.find(c => c.id === primaryCategoryId)
    }
  }

  return results
}, {
  maxAge: 60 * 60 * 24 * 7, // Cache for 7 days
  getKey: event => `autocomplete:${getQuery(event).q}`,
  swr: true, // Stale-while-revalidate
})

import * as v from 'valibot'
import { searchLocationsByText } from '../../utils/search'
import { generateEmbeddingCached } from '../../utils/embeddings'

const querySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
})

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event) => {
    const { q: searchQuery } = await getValidatedQuery(event, data => v.parse(querySchema, data))

    // Precompute embedding in background (non-blocking)
    generateEmbeddingCached(searchQuery).catch(() => {
      // Silent fail - precomputing is optional, search still works without it
    })

    // Only text search - semantic search is too slow for autocomplete
    return await searchLocationsByText(searchQuery)
  })
})

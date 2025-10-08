import * as v from 'valibot'

const querySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
})

export default defineEventHandler(async (event) => {
  const { q: searchQuery } = await getValidatedQuery(event, data => v.parse(querySchema, data))

  // Precompute embedding in background (non-blocking)
  generateEmbeddingCached(searchQuery).catch(() => {})

  // Only text search - semantic search is too slow for autocomplete
  return await searchLocationsByText(searchQuery)
})

import { consola } from 'consola'
import * as v from 'valibot'

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

  // Only text search - semantic search is too slow for autocomplete
  return await searchLocationsByText(searchQuery)
}, {
  maxAge: 60 * 60 * 24 * 7, // Cache for 7 days
  getKey: event => `autocomplete:${getQuery(event).q}`,
  swr: true, // Stale-while-revalidate
})

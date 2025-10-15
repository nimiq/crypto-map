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

  const fetchLimit = 10
  const searchOptions = { fetchLimit }

  const [textResults, semanticResults] = await Promise.all([
    searchLocationsByText(searchQuery, searchOptions),
    searchLocationsBySimilarCategories(searchQuery, searchOptions),
  ])

  type CombinedResult = Awaited<ReturnType<typeof searchLocationsByText>>[number]
  const combined = new Map<string, CombinedResult>()

  for (const location of textResults || []) {
    combined.set(location.uuid, location)
  }

  for (const location of semanticResults || []) {
    if (!combined.has(location.uuid))
      combined.set(location.uuid, location as CombinedResult)
  }

  return Array.from(combined.values()).slice(0, fetchLimit)
}, {
  maxAge: 60 * 60 * 24 * 7, // Cache for 7 days
  getKey: event => `autocomplete:${getQuery(event).q}`,
  swr: true, // Stale-while-revalidate
})

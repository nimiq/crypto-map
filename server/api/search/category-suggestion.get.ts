import { consola } from 'consola'
import * as v from 'valibot'

const logger = consola.withTag('category-suggestion')

const querySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
})

export default defineCachedEventHandler(async (event) => {
  try {
    const { q } = await getValidatedQuery(event, data => v.parse(querySchema, data))
    return await getCategorySuggestion(q)
  }
  catch (error) {
    logger.error('Failed to resolve category suggestion:', error)
    return null
  }
}, {
  maxAge: 60 * 60 * 6, // Cache for 6 hours; suggestions are stable
  getKey: event => `category-suggestion:${getQuery(event).q}`,
  swr: true,
})

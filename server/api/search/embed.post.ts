import * as v from 'valibot'
import { generateEmbeddingCached } from '../../utils/embeddings'

const bodySchema = v.object({
  q: v.pipe(v.string(), v.minLength(2, 'Query must be at least 2 characters')),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = v.safeParse(bodySchema, body)

  if (!result.success)
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body', data: result.issues })

  const { q: searchQuery } = result.output

  // Fire-and-forget to avoid blocking autocomplete responses
  generateEmbeddingCached(searchQuery).catch(() => {
    // Silent fail - precomputing is optional, search still works without it
  })

  return { ok: true }
})

import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate embedding for a text query using OpenAI
 * Uses AI SDK with caching support
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const config = useRuntimeConfig()

  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  })

  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  })

  return embedding
}

/**
 * Generate embedding with KV cache
 * Caches embeddings to avoid regenerating for same queries
 */
export async function generateEmbeddingCached(text: string): Promise<number[]> {
  // Normalize the text for consistent caching
  const normalizedText = text.trim().toLowerCase()
  const cacheKey = `embedding:${normalizedText}`

  // Try to get from cache
  const cached = await hubKV().get<number[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Generate new embedding
  const embedding = await generateEmbedding(text)

  // Cache for 30 days
  await hubKV().set(cacheKey, embedding, { ttl: 60 * 60 * 24 * 30 })

  return embedding
}

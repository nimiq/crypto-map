import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

// AI SDK handles retries and error handling better than direct API calls
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = createOpenAI()

  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  })

  return embedding
}

// Permanent cache reduces API costs and improves response times for repeated searches
export async function generateEmbeddingCached(text: string): Promise<number[]> {
  // Normalize to maximize cache hits across user input variations
  const normalizedText = text.trim().toLowerCase()
  const cacheKey = `embedding:${normalizedText}`

  const cached = await hubKV().get<number[]>(cacheKey)
  if (cached) {
    return cached
  }

  const embedding = await generateEmbedding(text)

  // No TTL - embeddings never change for the same text
  await hubKV().set(cacheKey, embedding)

  return embedding
}

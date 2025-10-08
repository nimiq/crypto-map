import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

// Permanent cache reduces API costs and improves response times for repeated searches
export async function generateEmbeddingCached(text: string): Promise<number[]> {
  const cacheKey = `embedding:${text.trim().toLowerCase()}`
  
  const cached = await hubKV().get<number[]>(cacheKey)
  if (cached)
    return cached
  
  const { embedding } = await embed({ model: createOpenAI().embedding(EMBEDDING_MODEL), value: text })
  await hubKV().set(cacheKey, embedding)
  return embedding
}

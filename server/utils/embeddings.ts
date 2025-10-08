import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

export async function generateEmbeddingCached(value: string): Promise<number[]> {
  const cacheKey = `embedding:${value.trim().toLowerCase()}`
  
  const cached = await hubKV().get<number[]>(cacheKey)
  if (cached)
    return cached
  
  const model = createOpenAI({ apiKey: useRuntimeConfig().openaiApiKey }).embedding('text-embedding-3-small')
  const { embedding } = await embed({ model, value })

  await hubKV().set(cacheKey, embedding)

  return embedding
}

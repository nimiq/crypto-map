import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

export async function generateEmbeddingCached(value: string): Promise<number[]> {
  const normalizedValue = value.trim().toLowerCase()
  const cacheKey = `embedding:${normalizedValue}`

  const cached = await hubKV().get<number[]>(cacheKey)
  if (cached)
    return cached

  const model = createOpenAI({ apiKey: useRuntimeConfig().openaiApiKey }).embedding('text-embedding-3-small')
  const { embedding } = await embed({ model, value })

  await hubKV().set(cacheKey, embedding)

  return embedding
}

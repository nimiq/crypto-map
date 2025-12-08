import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

export async function generateEmbeddingCached(value: string): Promise<number[]> {
  const normalizedValue = value.trim().toLowerCase()
  const cacheKey = `embedding:${normalizedValue}`

  const cached = await kv.get(cacheKey) as number[] | null
  if (cached)
    return cached

  const model = createOpenAI({ apiKey: useRuntimeConfig().openaiApiKey }).embedding('text-embedding-3-small')
  const { embedding } = await embed({ model, value })

  await kv.set(cacheKey, embedding as unknown as string)

  return [...embedding]
}

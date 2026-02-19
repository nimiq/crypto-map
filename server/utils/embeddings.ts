import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'
import { consola } from 'consola'

export async function generateEmbeddingCached(value: string): Promise<number[]> {
  const normalizedValue = value.trim().toLowerCase()
  const cacheKey = `embedding:${normalizedValue}`

  const cached = await kv.get(cacheKey) as number[] | null
  if (cached) {
    consola.info('[perf] embedding: cache hit')
    return cached
  }

  consola.info('[perf] embedding: cache miss, calling OpenAI')
  const start = performance.now()
  const model = createOpenAI({ apiKey: useRuntimeConfig().openaiApiKey }).embedding('text-embedding-3-small')
  const { embedding } = await embed({ model, value })
  consola.info(`[perf] embedding: OpenAI ${(performance.now() - start).toFixed(0)}ms`)

  await kv.set(cacheKey, embedding as unknown as string)

  return [...embedding]
}

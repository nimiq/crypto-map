import process from 'node:process'
import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'

/**
 * AI SDK configuration for embeddings
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

/**
 * Create OpenAI provider instance using environment API key
 */
function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required for embedding generation')
  }

  return createOpenAI({ apiKey })
}

/**
 * Generate embedding for a single text using AI SDK
 * @param text - Text to generate embedding for
 * @returns Promise<number[]> - Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = createOpenAIProvider()

    const { embedding } = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      value: text,
    })

    // Verify embedding dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Expected embedding dimensions: ${EMBEDDING_DIMENSIONS}, got: ${embedding.length}`)
    }

    return embedding
  }
  catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

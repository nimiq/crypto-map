import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createOpenAI } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import { createConsola } from 'consola'
import { config } from 'dotenv'
import { join } from 'pathe'

// Load environment variables
config()

const consola = createConsola().withTag('embedding')

// Use shared constants for consistency
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const MAX_PARALLEL_CALLS = 5

interface Category {
  id: string
  name: string
  icon: string
  embeddings?: number[]
}

/**
 * Create OpenAI provider instance with improved error handling
 */
function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required for embedding generation')
  }

  return createOpenAI({ apiKey })
}

/**
 * Validate embedding dimensions for consistency
 */
function validateEmbeddings(embeddings: number[][], expectedCount: number): void {
  if (embeddings.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} embeddings, got ${embeddings.length}`)
  }

  for (let i = 0; i < embeddings.length; i++) {
    if (embeddings[i].length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding ${i} has incorrect dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embeddings[i].length}`)
    }
  }
}

async function main() {
  try {
    // Validate environment setup
    const openai = createOpenAIProvider()
    consola.info('AI SDK OpenAI provider initialized successfully')

    // Load and validate categories data
    const categoriesPath = join(import.meta.dirname, 'categories.json')
    let categoriesContent: string
    let categories: Category[]

    try {
      categoriesContent = await readFile(categoriesPath, 'utf-8')
      categories = JSON.parse(categoriesContent)
    }
    catch (error) {
      consola.error('Failed to read or parse categories.json:', error)
      consola.info('Make sure categories.json exists and contains valid JSON')
      process.exit(1)
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      consola.error('Categories data is invalid or empty')
      process.exit(1)
    }

    // Check if embeddings already exist
    const hasEmbeddings = categories.some(cat => cat.embeddings && cat.embeddings.length > 0)
    if (hasEmbeddings) {
      consola.warn('Categories already have embeddings!')
      consola.warn('Remove the 'embeddings' field from categories.json and run again to regenerate')
      process.exit(0)
    }

    consola.info(`Found ${categories.length} categories`)
    consola.start(`Generating embeddings using ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS} dimensions)`)

    // Prepare category names for embedding generation
    const categoryNames = categories.map(c => c.name)
    consola.info(`Processing categories: ${categoryNames.slice(0, 5).join(', ')}${categoryNames.length > 5 ? '...' : ''}`)

    // Generate embeddings using AI SDK with improved error handling
    let embeddings: number[][]
    let usage: any

    try {
      const result = await embedMany({
        model: openai.embedding(EMBEDDING_MODEL),
        values: categoryNames,
        maxParallelCalls: MAX_PARALLEL_CALLS,
      })

      embeddings = result.embeddings
      usage = result.usage

      // Validate embeddings using AI SDK's built-in validation
      validateEmbeddings(embeddings, categories.length)

      consola.success(`Generated ${embeddings.length} embeddings`)
      consola.info(`Token usage: ${usage.tokens} tokens`)
    }
    catch (error) {
      consola.error('Failed to generate embeddings using AI SDK:', error)

      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          consola.info('Rate limit exceeded. AI SDK will automatically retry with exponential backoff.')
        }
        else if (error.message.includes('API key')) {
          consola.info('Check your OPENAI_API_KEY environment variable')
        }
        else if (error.message.includes('network')) {
          consola.info('Network error occurred. Check your internet connection.')
        }
      }

      process.exit(1)
    }

    // Add embeddings to categories with validation
    const updatedCategories = categories.map((cat, i) => {
      const embedding = embeddings[i]

      // Ensure embedding is valid
      if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding for category '${cat.name}' at index ${i}`)
      }

      return {
        ...cat,
        embeddings: embedding,
      }
    })

    // Write updated categories back to JSON file with error handling
    try {
      await writeFile(categoriesPath, JSON.stringify(updatedCategories, null, 2), 'utf-8')
      consola.success(`Embeddings saved to ${categoriesPath}`)
      consola.info('Commit the updated categories.json file to git')
    }
    catch (error) {
      consola.error('Failed to write updated categories to file:', error)
      process.exit(1)
    }
  }
  catch (error) {
    consola.error('Unexpected error during embedding generation:', error)

    if (error instanceof Error) {
      consola.error('Error details:', error.message)
      if (error.stack) {
        consola.debug('Stack trace:', error.stack)
      }
    }

    process.exit(1)
  }
}

main()

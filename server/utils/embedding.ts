import type { Category, Location } from '../../database/schema'
import OpenAI from 'openai'

/**
 * Configuration for the embedding service
 */
interface EmbeddingConfig {
  model: string
  maxRetries: number
  baseDelay: number
  maxDelay: number
  batchSize: number
}

/**
 * Default configuration for the embedding service
 */
const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small',
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  batchSize: 100, // OpenAI batch limit
}

/**
 * Content structure for embedding generation
 */
interface EmbeddingContent {
  locationName: string
  address: string
  categories: string[]
  combinedText: string
}

/**
 * Service for generating embeddings using OpenAI API
 */
export class EmbeddingService {
  private openai: OpenAI
  private config: EmbeddingConfig

  constructor(apiKey: string, config: Partial<EmbeddingConfig> = {}) {
    this.openai = new OpenAI({
      apiKey,
    })
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Prepare location text content for embedding generation
   */
  prepareLocationContent(location: Location, categories: Category[]): EmbeddingContent {
    const categoryNames = categories.map(cat => cat.name)

    // Combine location information into a searchable text format
    const combinedText = [
      location.name,
      location.address,
      ...categoryNames,
    ].filter(Boolean).join(', ')

    return {
      locationName: location.name,
      address: location.address,
      categories: categoryNames,
      combinedText,
    }
  }

  /**
   * Generate embedding for a single text with retry logic
   */
  async generateEmbedding(text: string): Promise<number[]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: text,
        })

        if (response.data && response.data.length > 0 && response.data[0]) {
          return response.data[0].embedding
        }

        throw new Error('No embedding data received from OpenAI API')
      }
      catch (error) {
        const errorInstance = error as Error
        lastError = errorInstance

        // Don't retry on authentication errors
        if (error instanceof OpenAI.AuthenticationError) {
          throw new Error(`OpenAI authentication failed: ${error.message}`)
        }

        // Don't retry on invalid request errors
        if (error instanceof OpenAI.BadRequestError) {
          throw new Error(`Invalid request to OpenAI API: ${error.message}`)
        }

        // Retry on rate limit and other recoverable errors
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt)
          console.warn(`Embedding generation attempt ${attempt + 1} failed, retrying in ${delay}ms:`, errorInstance.message)
          await this.sleep(delay)
        }
      }
    }

    throw new Error(`Failed to generate embedding after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`)
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = []

    // Process in batches to respect API limits
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize)
      const batchResults = await this.processBatch(batch)
      results.push(...batchResults)

      // Add a small delay between batches to be respectful to the API
      if (i + this.config.batchSize < texts.length) {
        await this.sleep(100)
      }
    }

    return results
  }

  /**
   * Process a batch of texts for embedding generation
   */
  private async processBatch(texts: string[]): Promise<number[][]> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.model,
          input: texts,
        })

        if (response.data && response.data.length === texts.length) {
          return response.data.map(item => item.embedding)
        }

        throw new Error(`Expected ${texts.length} embeddings, got ${response.data?.length || 0}`)
      }
      catch (error) {
        const errorInstance = error as Error
        lastError = errorInstance

        // Don't retry on authentication errors
        if (error instanceof OpenAI.AuthenticationError) {
          throw new Error(`OpenAI authentication failed: ${error.message}`)
        }

        // Don't retry on invalid request errors
        if (error instanceof OpenAI.BadRequestError) {
          throw new Error(`Invalid request to OpenAI API: ${error.message}`)
        }

        // Retry on rate limit and other recoverable errors
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt)
          console.warn(`Batch embedding generation attempt ${attempt + 1} failed, retrying in ${delay}ms:`, errorInstance.message)
          await this.sleep(delay)
        }
      }
    }

    throw new Error(`Failed to generate batch embeddings after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`)
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * 2 ** attempt
    const jitter = Math.random() * 0.1 * exponentialDelay // Add up to 10% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxDelay)
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create and return a singleton embedding service instance
 */
let embeddingServiceInstance: EmbeddingService | null = null

export function useEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    const runtimeConfig = useRuntimeConfig()

    if (!runtimeConfig.openaiApiKey) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.')
    }

    embeddingServiceInstance = new EmbeddingService(runtimeConfig.openaiApiKey)
  }

  return embeddingServiceInstance
}

/**
 * Generate embedding for a location with its categories
 */
export async function generateLocationEmbedding(
  location: Location,
  categories: Category[],
): Promise<number[]> {
  const embeddingService = useEmbeddingService()
  const content = embeddingService.prepareLocationContent(location, categories)
  return embeddingService.generateEmbedding(content.combinedText)
}

/**
 * Generate embeddings for multiple locations with their categories
 */
export async function generateLocationEmbeddings(
  locationsWithCategories: Array<{ location: Location, categories: Category[] }>,
): Promise<number[][]> {
  const embeddingService = useEmbeddingService()

  const texts = locationsWithCategories.map(({ location, categories }) => {
    const content = embeddingService.prepareLocationContent(location, categories)
    return content.combinedText
  })

  return embeddingService.generateBatchEmbeddings(texts)
}

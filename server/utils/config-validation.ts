import { consola } from 'consola'

/**
 * Configuration validation utility for vector search functionality
 */
export class ConfigValidator {
  /**
   * Validate all required environment variables and configuration
   */
  static validateConfiguration(): void {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const runtimeConfig = useRuntimeConfig()

      // Validate OpenAI API key
      if (!runtimeConfig.openaiApiKey || runtimeConfig.openaiApiKey.trim() === '') {
        errors.push('OpenAI API key is required for vector search functionality. Please set OPENAI_API_KEY environment variable.')
      }
      else if (runtimeConfig.openaiApiKey === 'your_openai_api_key_here') {
        errors.push('OpenAI API key appears to be a placeholder. Please set a valid OPENAI_API_KEY environment variable.')
      }
      else if (!runtimeConfig.openaiApiKey.startsWith('sk-')) {
        warnings.push('OpenAI API key format appears invalid. Valid keys should start with "sk-".')
      }

      // Validate PostgreSQL configuration
      if (!runtimeConfig.postgres.host || runtimeConfig.postgres.host.trim() === '') {
        errors.push('PostgreSQL host is required. Please set POSTGRES_HOST environment variable.')
      }

      if (!runtimeConfig.postgres.port || runtimeConfig.postgres.port.trim() === '') {
        errors.push('PostgreSQL port is required. Please set POSTGRES_PORT environment variable.')
      }

      if (!runtimeConfig.postgres.user || runtimeConfig.postgres.user.trim() === '') {
        errors.push('PostgreSQL user is required. Please set POSTGRES_USER environment variable.')
      }

      if (!runtimeConfig.postgres.password || runtimeConfig.postgres.password.trim() === '') {
        errors.push('PostgreSQL password is required. Please set POSTGRES_PASSWORD environment variable.')
      }

      if (!runtimeConfig.postgres.db || runtimeConfig.postgres.db.trim() === '') {
        errors.push('PostgreSQL database name is required. Please set POSTGRES_DB environment variable.')
      }

      // Validate vector search configuration
      this.validateVectorSearchConfig(runtimeConfig.vectorSearch, errors, warnings)

      // Validate OpenAI embedding configuration
      this.validateEmbeddingConfig(runtimeConfig.openaiEmbedding, errors, warnings)

      // Report validation results
      if (warnings.length > 0) {
        consola.warn('Configuration warnings detected:')
        warnings.forEach(warning => consola.warn(`  - ${warning}`))
      }

      if (errors.length > 0) {
        consola.error('Configuration validation failed:')
        errors.forEach(error => consola.error(`  - ${error}`))
        consola.error('\nPlease check your environment variables and try again.')
        consola.info('Refer to .env.example for the complete list of required variables.')
        throw new Error(`Configuration validation failed with ${errors.length} error(s)`)
      }

      consola.success('Configuration validation passed successfully')
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('Configuration validation failed')) {
        throw error
      }

      consola.error('Failed to validate configuration:', error)
      throw new Error('Configuration validation failed due to unexpected error')
    }
  }

  /**
   * Validate vector search configuration parameters
   */
  private static validateVectorSearchConfig(
    config: any,
    errors: string[],
    warnings: string[],
  ): void {
    if (typeof config.keywordLimit !== 'number' || config.keywordLimit < 1 || config.keywordLimit > 100) {
      errors.push('VECTOR_SEARCH_KEYWORD_LIMIT must be a number between 1 and 100')
    }

    if (typeof config.vectorLimit !== 'number' || config.vectorLimit < 1 || config.vectorLimit > 100) {
      errors.push('VECTOR_SEARCH_VECTOR_LIMIT must be a number between 1 and 100')
    }

    if (typeof config.hybridThreshold !== 'number' || config.hybridThreshold < 1 || config.hybridThreshold > 50) {
      errors.push('VECTOR_SEARCH_HYBRID_THRESHOLD must be a number between 1 and 50')
    }

    if (typeof config.similarityThreshold !== 'number' || config.similarityThreshold < 0 || config.similarityThreshold > 1) {
      errors.push('VECTOR_SEARCH_SIMILARITY_THRESHOLD must be a number between 0 and 1')
    }

    // Logical validation
    if (config.hybridThreshold > config.keywordLimit) {
      warnings.push('VECTOR_SEARCH_HYBRID_THRESHOLD is greater than VECTOR_SEARCH_KEYWORD_LIMIT. Vector search may never be triggered.')
    }

    if (config.similarityThreshold > 0.9) {
      warnings.push('VECTOR_SEARCH_SIMILARITY_THRESHOLD is very high (>0.9). This may result in very few vector search results.')
    }

    if (config.similarityThreshold < 0.3) {
      warnings.push('VECTOR_SEARCH_SIMILARITY_THRESHOLD is very low (<0.3). This may result in many irrelevant vector search results.')
    }
  }

  /**
   * Validate OpenAI embedding configuration parameters
   */
  private static validateEmbeddingConfig(
    config: any,
    errors: string[],
    warnings: string[],
  ): void {
    if (!config.model || typeof config.model !== 'string') {
      errors.push('OPENAI_EMBEDDING_MODEL must be a non-empty string')
    }
    else if (!config.model.includes('embedding')) {
      warnings.push('OPENAI_EMBEDDING_MODEL does not appear to be an embedding model')
    }

    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('OPENAI_EMBEDDING_MAX_RETRIES must be a number between 0 and 10')
    }

    if (typeof config.baseDelay !== 'number' || config.baseDelay < 100 || config.baseDelay > 10000) {
      errors.push('OPENAI_EMBEDDING_BASE_DELAY must be a number between 100 and 10000 (milliseconds)')
    }

    if (typeof config.maxDelay !== 'number' || config.maxDelay < 1000 || config.maxDelay > 300000) {
      errors.push('OPENAI_EMBEDDING_MAX_DELAY must be a number between 1000 and 300000 (milliseconds)')
    }

    if (typeof config.batchSize !== 'number' || config.batchSize < 1 || config.batchSize > 2048) {
      errors.push('OPENAI_EMBEDDING_BATCH_SIZE must be a number between 1 and 2048')
    }

    // Logical validation
    if (config.maxDelay <= config.baseDelay) {
      errors.push('OPENAI_EMBEDDING_MAX_DELAY must be greater than OPENAI_EMBEDDING_BASE_DELAY')
    }

    if (config.maxRetries > 5) {
      warnings.push('OPENAI_EMBEDDING_MAX_RETRIES is high (>5). This may result in long delays during API failures.')
    }

    if (config.batchSize > 100) {
      warnings.push('OPENAI_EMBEDDING_BATCH_SIZE is high (>100). Consider reducing it to avoid rate limits.')
    }
  }

  /**
   * Validate configuration and provide helpful setup guidance
   */
  static validateWithGuidance(): void {
    try {
      this.validateConfiguration()
    }
    catch (error) {
      consola.error('\n=== Vector Search Configuration Setup Guide ===')
      consola.info('1. Copy .env.example to .env if you haven\'t already:')
      consola.info('   cp .env.example .env')
      consola.info('\n2. Edit .env and set the following required variables:')
      consola.info('   - OPENAI_API_KEY: Your OpenAI API key (get one at https://platform.openai.com/api-keys)')
      consola.info('   - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB')
      consola.info('\n3. Optional: Customize vector search parameters:')
      consola.info('   - VECTOR_SEARCH_KEYWORD_LIMIT: Max keyword search results (default: 10)')
      consola.info('   - VECTOR_SEARCH_VECTOR_LIMIT: Max vector search results (default: 10)')
      consola.info('   - VECTOR_SEARCH_HYBRID_THRESHOLD: Trigger vector search when keyword results < this (default: 5)')
      consola.info('   - VECTOR_SEARCH_SIMILARITY_THRESHOLD: Minimum similarity score for vector results (default: 0.7)')
      consola.info('\n4. Optional: Customize OpenAI embedding parameters:')
      consola.info('   - OPENAI_EMBEDDING_MODEL: OpenAI model to use (default: text-embedding-3-small)')
      consola.info('   - OPENAI_EMBEDDING_MAX_RETRIES: Max retry attempts (default: 3)')
      consola.info('   - OPENAI_EMBEDDING_BASE_DELAY: Initial retry delay in ms (default: 1000)')
      consola.info('   - OPENAI_EMBEDDING_MAX_DELAY: Maximum retry delay in ms (default: 30000)')
      consola.info('   - OPENAI_EMBEDDING_BATCH_SIZE: Batch size for embedding generation (default: 100)')
      consola.info('\n5. Restart the application after making changes.')
      consola.info('===============================================\n')

      throw error
    }
  }
}

/**
 * Convenience function to validate configuration during startup
 */
export function validateVectorSearchConfig(): void {
  ConfigValidator.validateWithGuidance()
}

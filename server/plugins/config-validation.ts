import process from 'node:process'
import { validateVectorSearchConfig } from '../utils/config-validation'

/**
 * Nitro plugin to validate configuration during server startup
 */
export default defineNitroPlugin(async (_nitroApp) => {
  // Only validate configuration in production and development environments
  // Skip validation in test environments to avoid issues with missing test configs
  if (process.env.NODE_ENV !== 'test') {
    try {
      validateVectorSearchConfig()
    }
    catch (error) {
      // In development, log the error but don't crash the server
      // This allows developers to start the server and fix configuration issues
      if (process.env.NODE_ENV === 'development') {
        console.warn('Configuration validation failed in development mode. Vector search functionality may not work properly.')
        console.warn('Error:', error instanceof Error ? error.message : String(error))
      }
      else {
        // In production, crash the server if configuration is invalid
        console.error('Configuration validation failed. Server cannot start.')
        process.exit(1)
      }
    }
  }
})

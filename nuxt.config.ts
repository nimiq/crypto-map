import process from 'node:process'
// import { icons as nimiqIcons } from 'nimiq-icons'
import { defineNuxtConfig } from 'nuxt/config'
import * as v from 'valibot'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@unocss/nuxt',
    '@vueuse/nuxt',
    'nuxt-safe-runtime-config',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    'reka-ui/nuxt',
    '@nuxt/image',
    '@nuxtjs/i18n',
  ],
  hub: {
    database: true,
    blob: true,
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  runtimeConfig: {
    googleApiKey: process.env.NUXT_GOOGLE_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    postgres: {
      host: process.env.POSTGRES_HOST || '',
      port: process.env.POSTGRES_PORT || '',
      user: process.env.POSTGRES_USER || '',
      password: process.env.POSTGRES_PASSWORD || '',
      db: process.env.POSTGRES_DB || '',
    },
    vectorSearch: {
      keywordLimit: Number(process.env.VECTOR_SEARCH_KEYWORD_LIMIT) || 10,
      vectorLimit: Number(process.env.VECTOR_SEARCH_VECTOR_LIMIT) || 10,
      hybridThreshold: Number(process.env.VECTOR_SEARCH_HYBRID_THRESHOLD) || 5,
      similarityThreshold: Number(process.env.VECTOR_SEARCH_SIMILARITY_THRESHOLD) || 0.7,
    },
    openaiEmbedding: {
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      maxRetries: Number(process.env.OPENAI_EMBEDDING_MAX_RETRIES) || 3,
      baseDelay: Number(process.env.OPENAI_EMBEDDING_BASE_DELAY) || 1000,
      maxDelay: Number(process.env.OPENAI_EMBEDDING_MAX_DELAY) || 30000,
      batchSize: Number(process.env.OPENAI_EMBEDDING_BATCH_SIZE) || 100,
    },
  },
  safeRuntimeConfig: {
    $schema: v.object({
      googleApiKey: v.pipe(v.string(), v.minLength(1, 'Google API key is required')),
      openaiApiKey: v.pipe(v.string(), v.minLength(1, 'OpenAI API key is required for vector search functionality')),
      postgres: v.object({
        host: v.pipe(v.string(), v.minLength(1, 'PostgreSQL host is required')),
        port: v.pipe(v.string(), v.minLength(1, 'PostgreSQL port is required')),
        user: v.pipe(v.string(), v.minLength(1, 'PostgreSQL user is required')),
        password: v.pipe(v.string(), v.minLength(1, 'PostgreSQL password is required')),
        db: v.pipe(v.string(), v.minLength(1, 'PostgreSQL database is required')),
      }),
      vectorSearch: v.object({
        keywordLimit: v.pipe(v.number(), v.minValue(1, 'Keyword search limit must be at least 1'), v.maxValue(100, 'Keyword search limit cannot exceed 100')),
        vectorLimit: v.pipe(v.number(), v.minValue(1, 'Vector search limit must be at least 1'), v.maxValue(100, 'Vector search limit cannot exceed 100')),
        hybridThreshold: v.pipe(v.number(), v.minValue(1, 'Hybrid threshold must be at least 1'), v.maxValue(50, 'Hybrid threshold cannot exceed 50')),
        similarityThreshold: v.pipe(v.number(), v.minValue(0, 'Similarity threshold must be between 0 and 1'), v.maxValue(1, 'Similarity threshold must be between 0 and 1')),
      }),
      openaiEmbedding: v.object({
        model: v.pipe(v.string(), v.minLength(1, 'OpenAI embedding model is required')),
        maxRetries: v.pipe(v.number(), v.minValue(0, 'Max retries must be at least 0'), v.maxValue(10, 'Max retries cannot exceed 10')),
        baseDelay: v.pipe(v.number(), v.minValue(100, 'Base delay must be at least 100ms'), v.maxValue(10000, 'Base delay cannot exceed 10 seconds')),
        maxDelay: v.pipe(v.number(), v.minValue(1000, 'Max delay must be at least 1 second'), v.maxValue(300000, 'Max delay cannot exceed 5 minutes')),
        batchSize: v.pipe(v.number(), v.minValue(1, 'Batch size must be at least 1'), v.maxValue(2048, 'Batch size cannot exceed OpenAI limit of 2048')),
      }),
    }),
  },
  icon: {
    collections: ['tabler'],
    // customCollections: [nimiqIcons],
    clientBundle: {
      sizeLimitKb: 512, // 512KB
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
    ],
    langDir: 'locales',
  },
  compatibilityDate: '2025-10-01',
})

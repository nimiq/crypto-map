import process from 'node:process'
import { icons as nimiqFlags } from 'nimiq-flags'
import { icons as nimiqIcons } from 'nimiq-icons'
import { defineNuxtConfig } from 'nuxt/config'
import * as v from 'valibot'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@unocss/nuxt',
    '@vueuse/nuxt',
    'motion-v/nuxt',
    'nuxt-safe-runtime-config',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    'reka-ui/nuxt',
    '@nuxt/image',
    '@nuxtjs/i18n',
  ],
  nitro: {
    experimental: {
      wasm: true,
    },
  },
  hub: {
    database: false,
    blob: true,
    kv: true,
    cache: true,
    ...(process.env.HYPERDRIVE_ID && {
      bindings: {
        hyperdrive: {
          POSTGRES: process.env.HYPERDRIVE_ID,
        },
      },
    }),
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  runtimeConfig: {
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
    hyperdriveId: process.env.HYPERDRIVE_ID || '',
  },
  safeRuntimeConfig: {
    $schema: v.object({
      googleApiKey: v.pipe(v.string(), v.minLength(1, 'GOOGLE_API_KEY is required')),
      openaiApiKey: v.pipe(v.string(), v.minLength(1, 'OPENAI_API_KEY is required')),
      databaseUrl: v.pipe(v.string(), v.minLength(1, 'DATABASE_URL is required')),
      hyperdriveId: v.optional(v.string()),
    }),
  },
  icon: {
    serverBundle: 'local',
    clientBundle: {
      sizeLimitKb: 2048,
    },
    collections: ['tabler'],
    customCollections: [
      nimiqIcons,
      nimiqFlags,
      {
        prefix: 'providers',
        dir: './public/providers',
      },
    ],
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
  routeRules: {
    '/api/categories': { cache: { maxAge: 3600, swr: true, staleMaxAge: 43200 } },
    '/api/locations': { cache: false },
    '/api/locations/*': { cache: { maxAge: 900, swr: true, staleMaxAge: 900 } },
    '/api/image': { cache: { maxAge: 31536000, swr: true } },
  },
  compatibilityDate: '2025-10-01',
})

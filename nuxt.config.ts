import process from 'node:process'
import { icons as nimiqFlags } from 'nimiq-flags'
import { icons as nimiqIcons } from 'nimiq-icons'
import { defineNuxtConfig } from 'nuxt/config'
import * as v from 'valibot'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core-nightly',
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
    'nuxt-maplibre',
  ],
  experimental: {
    viewTransition: true,
  },
  hub: {
    blob: true,
    kv: true,
    database: {
      dialect: 'postgresql',
    },
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
    public: {
      siteURL: import.meta.dev
        ? ' http://localhost:3000'
        : 'https://crypto-map-next.je-cf9.workers.dev/',
    },
  },
  safeRuntimeConfig: {
    $schema: v.object({
      googleApiKey: v.pipe(v.string(), v.minLength(1, 'GOOGLE_API_KEY is required')),
      openaiApiKey: v.pipe(v.string(), v.minLength(1, 'OPENAI_API_KEY is required')),
      databaseUrl: v.pipe(v.string(), v.minLength(1, 'DATABASE_URL is required')),
      public: v.object({ siteURL: v.string() }),
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
  image: {
    providers: {
      cloudflareOnProd: {
        provider: '~/providers/cloudflareOnProd.ts',
      },
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
  routeRules: {
    '/api/categories': {
      cache: { maxAge: 3600, swr: true, staleMaxAge: 43200 },
    },
    '/api/locations': { cache: false },
    '/api/locations/country-counts': {
      cache: { maxAge: 86400, swr: true, staleMaxAge: 604800 }, // 24h cache, 7d stale
    },
    '/api/locations/*': {
      cache: { maxAge: 900, swr: true, staleMaxAge: 900 },
    },
    '/api/tiles/**': { cache: false },
  },
  vite: {
    optimizeDeps: {
      include: ['maplibre-gl'],
    },
  },
  nitro: {
    preset: 'cloudflare-module',
  },
  compatibilityDate: '2025-10-01',
})

import process from 'node:process'
import { icons as nimiqFlags } from 'nimiq-flags'
import { icons as nimiqIcons } from 'nimiq-icons'
import { defineNuxtConfig } from 'nuxt/config'
import * as v from 'valibot'

export default defineNuxtConfig({
  app: {
    head: {
      base: { target: '_blank' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
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
    '@nuxtjs/i18n',
    'nuxt-maplibre',
  ],
  experimental: {
    viewTransition: true,
  },
  hub: {
    blob: { driver: 'cloudflare-r2', binding: 'BLOB', bucketName: 'crypto-map-blob' },
    kv: { namespaceId: 'bda3fdd277fa4ae0a6fba540b0a7e087' },
    cache: { namespaceId: 'de83ac81c26b4b54bffdab7d49c1e1e1' },
    db: { dialect: 'postgresql', connection: { hyperdriveId: '13b2f378321849e289540144583857e5' } },
  },
  nitro: {
    cloudflare: {
      wrangler: {
        name: 'crypto-map',
        account_id: 'cf9baad7d68d7ee717f3339731e81dfb',
        compatibility_date: '2026-02-19',
        compatibility_flags: ['nodejs_compat'],
        observability: { enabled: true, logs: { enabled: true, head_sampling_rate: 1, invocation_logs: true } },
      },
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
      siteUrl: '', // Set via NUXT_PUBLIC_SITE_URL in production
    },
  },
  safeRuntimeConfig: {
    $schema: v.object({
      googleApiKey: v.pipe(v.string(), v.minLength(1, 'GOOGLE_API_KEY is required')),
      openaiApiKey: v.pipe(v.string(), v.minLength(1, 'OPENAI_API_KEY is required')),
      databaseUrl: v.pipe(v.string(), v.minLength(1, 'DATABASE_URL is required')),
      public: v.object({ siteUrl: v.string() }),
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
    strategy: 'no_prefix',
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_locale', fallbackLocale: 'en' },
  },
  routeRules: {
    '/api/categories': { cache: { maxAge: 3600, swr: true, staleMaxAge: 43200 } },
    '/api/locations': { cache: false },
    '/api/locations/country-counts': { cache: { maxAge: 86400, swr: true, staleMaxAge: 604800 } },
    '/api/locations/*': { cache: { maxAge: 900, swr: true, staleMaxAge: 900 } },
    '/api/tiles/**': { cache: false },
  },
  vite: {
    optimizeDeps: {
      include: ['maplibre-gl'],
    },
  },
  compatibilityDate: '2026-02-19',
})

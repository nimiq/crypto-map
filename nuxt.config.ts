import process from 'node:process'
// import { icons as nimiqIcons} from 'nimiq-icons'
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
    databaseUrl: process.env.DATABASE_URL || '',
  },
  safeRuntimeConfig: {
    // Allow empty strings for CI builds, validate manually at runtime
    $schema: v.object({
      googleApiKey: v.string(),
      openaiApiKey: v.string(),
      databaseUrl: v.string(),
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

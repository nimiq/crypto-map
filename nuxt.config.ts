import process from 'node:process'
import { icons as nimiqIcons } from 'nimiq-icons'
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
    postgres: {
      host: process.env.POSTGRES_HOST || '',
      port: process.env.POSTGRES_PORT || '',
      user: process.env.POSTGRES_USER || '',
      password: process.env.POSTGRES_PASSWORD || '',
      db: process.env.POSTGRES_DB || '',
    },
  },
  safeRuntimeConfig: {
    $schema: v.object({
      googleApiKey: v.pipe(v.string(), v.minLength(1, 'Google API key is required')),
      postgres: v.object({
        host: v.pipe(v.string(), v.minLength(1, 'PostgreSQL host is required')),
        port: v.pipe(v.string(), v.minLength(1, 'PostgreSQL port is required')),
        user: v.pipe(v.string(), v.minLength(1, 'PostgreSQL user is required')),
        password: v.pipe(v.string(), v.minLength(1, 'PostgreSQL password is required')),
        db: v.pipe(v.string(), v.minLength(1, 'PostgreSQL database is required')),
      }),
    }),
  },
  icon: {
    collections: ['tabler'],
    customCollections: [nimiqIcons],
    clientBundle: {
      sizeLimitKb: 512, // 512KB
    },
  },
  i18n: {
    lazy: true,
    langDir: 'locales',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'pt', language: 'pt-PT', name: 'Português', file: 'pt.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix',
    rootRedirect: 'en',
    detectBrowserLanguage: {
      redirectOn: 'root',
      useCookie: true,
    },
  },
  compatibilityDate: '2025-10-01',
})

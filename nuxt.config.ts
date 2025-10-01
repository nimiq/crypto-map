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
  },
  compatibilityDate: '2025-10-01',
})

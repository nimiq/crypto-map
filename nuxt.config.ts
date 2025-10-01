import * as v from 'valibot'
import process from 'node:process'
import { icons as nimiqIcons } from 'nimiq-icons'

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
  },
  safeRuntimeConfig: {
    $schema: v.object({
      googleApiKey: v.pipe(v.string(), v.minLength(1, 'Google API key is required')),
    }),
  },
  icon: {
    collections: ['tabler'],
    customCollections: [nimiqIcons],
  },
  compatibilityDate: '2024-09-30',
})
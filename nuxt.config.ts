import * as v from 'valibot'
import process from 'node:process'

export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@unocss/nuxt',
    '@vueuse/nuxt',
    'nuxt-safe-runtime-config',
    '@nuxt/eslint',
    '@nuxt/fonts',
    'reka-ui/nuxt',
  ],
  hub: {
    database: true,
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
  compatibilityDate: '2024-09-30',
})

import { env } from 'node:process'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    typedPages: true,
  },

  build: {
    transpile: [/unplugin-vue-router\/runtime/],
  },

  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxt/eslint',
    'radix-vue/nuxt',
    '@nuxtjs/supabase',
    '@nuxt/fonts',
  ],

  supabase: {
    redirect: false,
  },

  runtimeConfig: {
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_KEY,
    supabaseAdminEmail: env.SUPABASE_ADMIN_EMAIL,
    supabaseAdminPassword: env.SUPABASE_ADMIN_PASSWORD,

    public: {
      googleMapKey: env.NUXT_GOOGLE_MAP_KEY,
      databaseUrl: env.NUXT_DATABASE_URL,
      databaseKey: env.NUXT_DATABASE_KEY,
      slackNewCandidateUrl: env.NUXT_SLACK_NEW_CANDIDATE_URL,
      slackReportUrl: env.NUXT_SLACK_REPORT_URL,
      // recaptcha: {
      //   v3SiteKey: process.env.NUXT_RECAPTCHA_SITE_KEY,
      // }
    },
  },

  imports: {
    dirs: ['~~/lib/geo-json.ts', '~~/types'],
    imports: [
      ...['Currency', 'Provider', 'Category'].map(name => ({ name, from: '~~/types/database.ts' })),
      ...['Issue'].map(name => ({ name, from: '~~/types/issue.ts', declarationType: true })),
      ...['CurrencyType', 'CurrencyTypeNoBNC', 'ProviderType', 'CategoryType'].map(name => ({ name, from: '~~/types/database.ts', type: true })),
      ...['LocationLink', 'Theme', 'LocationType'].map(name => ({ name, from: '~~/types/location.ts' })),
      ...['MapLocation', 'LocationBanner', 'CardType'].map(name => ({ name, from: '~~/types/location.ts', type: true })),
      ...['Cryptocity', 'CryptocityData'].map(name => ({ name, from: '~~/types/cryptocity.ts', type: true })),
      ...['BoundingBox', 'Cluster', 'MapPosition', 'ClusterArea', 'Point', 'LocationClusterParams', 'EstimatedMapPosition'].map(name => ({ name, from: '~~/types/map.ts', type: true })),
    ],
  },

  vite: {
    plugins: [
      // poLoader(),
      // poOptimizer(),
    ],
  },

  ignore: ['./bot'],

  eslint: {
    config: {
      standalone: false,
    },
  },

  compatibilityDate: '2024-07-17',
})

import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [
    HstVue(),
  ],
  setupFile: '/src/histoire-setup.ts',
  viteIgnorePlugins: ['pluginRewriteAll'],
  vite: {
    base: process.env.HISTOIRE_BASE || "/",
  },
  routerMode: 'hash',
})

import { presetNimiq } from 'nimiq-css'
import { defineConfig } from 'unocss'
import { presetOnmax } from 'unocss-preset-onmax'

export default defineConfig({
  presets: [
    presetOnmax(),
    presetNimiq({
      utilities: true,
      attributifyUtilities: true,
      fonts: false,
    }),
  ],
  // shadow-sm
  rules: [
    ['shadow-sm', { 'box-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }],
  ],
})

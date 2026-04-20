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
    ['shadow-xl', { 'box-shadow': '0 1px 2px rgba(60,64,67,0.3),0 1px 3px 1px rgba(60,64,67,0.15)' }],
  ],
  // Workaround: nimiq-css emits `.nq-scrollbar-hide` with a broken `undefined`
  // selector (upstream UnoCSS preset nested-rule bug). Covers class + the
  // attributify form produced by presetAttributify (`[nq-scrollbar-hide=""]`).
  preflights: [{
    getCSS: () => {
      const base = ['.nq-scrollbar-hide', '[nq-scrollbar-hide=""]']
      const webkit = base.map(s => `${s}::-webkit-scrollbar`)
      return `${base.join(',')}{scrollbar-width:none;-ms-overflow-style:none}${webkit.join(',')}{display:none}`
    },
  }],
})

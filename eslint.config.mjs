// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    formatters: true,
    unocss: true,
    pnpm: true,
    vue: true,
    ignores: ['.eslintcache', 'cache/**', '.claude/**', 'README.md', 'docs/**', 'database/scripts/categories.json'],
  }),
  {
    files: ['database/scripts/**/*.ts'],
    rules: {
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
    },
  },
)

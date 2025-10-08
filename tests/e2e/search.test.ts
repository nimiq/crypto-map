import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('Search functionality', () => {
  test('page loads', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    await expect(page.locator('h1')).toContainText('Crypto Map')
  })
})

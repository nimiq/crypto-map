import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

describe('index page i18n', () => {
  it('displays English title by default', async () => {
    const component = await mountSuspended(IndexPage)

    const h1 = component.find('h1')
    expect(h1.text()).toBe('Spend your crypto in Lugano')
  })

  it('switches to Spanish when locale is changed', async () => {
    const component = await mountSuspended(IndexPage)

    // Change locale (simulates what the query param plugin does in production)
    const i18n = component.vm.$i18n
    await i18n.setLocale('es')

    const h1 = component.find('h1')
    expect(h1.text()).toBe('Gasta tus criptomonedas en Lugano')
  })
})

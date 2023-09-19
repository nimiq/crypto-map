import { Cryptocity } from 'types'
import type { CryptocityContent } from 'types'
import { i18n } from '@/i18n/i18n-setup'

// Note that description is defined as a getter to be able to use the i18nKeyPassThrough, as the actual translation
// for providerLabel is happening in i18n-t in MapMarkers
export const cryptocitiesContent: Record<Exclude<Cryptocity, Cryptocity.None>, CryptocityContent> = {
  [Cryptocity.SanJose]: {
    name: `Criptociudad ${Cryptocity.SanJose}`,
    get description() {
      return [
        i18n.t('The San Jose Cryptocity Initiative is part of the Cryptocity endeavour led by Nimiq and its partners.'),
        i18n.t('We are strategically working with local businesses to stimulate the regional economy through the innovative use of cryptocurrency.'),
        i18n.t('You can learn more at'),
      ]
    },
    url: 'https://www.criptociudad.cr/',
  },
}

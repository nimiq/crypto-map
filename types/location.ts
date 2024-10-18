/**
Since the UI is quite flexible, better to define all cases using types, and we develop the UI from these types.
 */

import type { Cryptocity } from './cryptocity.js'
import type { ProviderType } from './database.ts'
import type { Tables } from './supabase.js'

export const enum LocationType {
  Shop = 'shop',
  Atm = 'atm',
}

// The theme is used to choose the right font color
export const enum Theme {
  Dark = 'dark',
  Light = 'light',
}

export const enum LocationLink {
  GMaps = 'gmaps',
  Instagram = 'instagram',
  Facebook = 'facebook',
}

export type LocationLinkType = typeof LocationLink[keyof typeof LocationLink]

// The different Banner designs
export type CardType = Extract<ProviderType, 'Bluecode' | 'Edenia' | 'Kurant' | 'NAKA' | 'Edenia' | 'Cryptopayment Link' | 'Opago' | 'Osmo'> | 'Nimiq-Pay' | 'Default' | 'DefaultAtm'

export interface LocationBanner {
  type: Exclude<CardType, 'Default'>

  // If the banner is a split banner, we need to provide the shortLabel
  label?: string
  shortLabel?: string

  tooltip: string
  tooltipCta?: string
  tooltipLabel?: string
  googlePlay?: string
  appStore?: string
  icon?: string
  style?: {
    // UI Options
    theme: Theme
    bg: (splitBanner: boolean) => string
    isDark: boolean
  }
}

export type MapLocation = Omit<Tables<'locations'>, 'lat' | 'lng' | 'provider' | 'cryptocity'> & {
  lng: number
  lat: number
  provider: ProviderType
  cryptocity: Cryptocity

  category_label: string

  // Given the social media fields, we can generate just one link
  // See parseLocation function for more details.
  linkTo?: LocationLink
  url?: string
  cardStyle: {
    // UI Options
    theme: Theme
    bg: [string /* primary color */, string | undefined /* For gradients */]
    isDark: boolean
    icon?: string
  }
  isAtm: boolean

  // The bottom part of the card
  splitBanner: boolean
  banner?: LocationBanner | [LocationBanner, LocationBanner]
}

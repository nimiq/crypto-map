/**
Since the UI is quite flexible, better to define all cases using types, and we develop the UI from these types.
 */

import type { Category, Currency, Provider } from './database.ts'

export enum LocationType {
  Shop = 'shop',
  Atm = 'atm',
}

// The theme is used to choose the right font color
export enum Theme {
  Dark = 'dark',
  Light = 'light',
}

export enum LocationLink {
  GMaps = 'gmaps',
  Instagram = 'instagram',
  Facebook = 'facebook',
}

// The different Banner designs
export type CardType = Provider.Bluecode | Provider.Edenia | Provider.Kurant | Provider.NAKA | Provider.Edenia | 'Nimiq-Pay' | Provider.DefaultAtm | Provider.CryptopaymentLink | Provider.Opago | Provider.Osmo | 'Default'

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

export type MapLocation = RawLocation & {
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

export interface RawLocation {
  uuid: string
  name: string
  address: string
  category: Category
  lat: number
  lng: number
  provider: Provider
  accepts: Currency[]
  sells: Currency[]
  rating?: number
  photo?: string
  instagram?: string
  facebook?: string
  gmaps?: string
  gmaps_types: string[]
  cryptocity: string
}

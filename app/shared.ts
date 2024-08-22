import { PROVIDERS } from 'database'
import type { DatabaseAnonArgs, MapLocation } from 'types'
import { DatabaseUser, LocationLink, Provider, Theme } from 'types'
import { getCardConfiguration } from './assets-dev/banner-assets'

export async function getAnonDatabaseArgs(): Promise<DatabaseAnonArgs> {
  await useApp().init()
  const { databaseUrl, databaseKey } = useRuntimeConfig().public
  return {
    url: databaseUrl,
    apikey: databaseKey,
    captchaToken: useApp().captchaTokenUuid,
    user: DatabaseUser.Anonymous,
  }
}

function getProvider({ provider, isAtm }: MapLocation) {
  const providerRoot = provider.split('/').at(0) as Provider // Some providers have a root and a subprovider. We don't care at the moment about the subprovider
  const isInvalidProvider = !providerRoot || !PROVIDERS.includes(providerRoot)
  if (isInvalidProvider) {
    const newProvider = isAtm ? Provider.DefaultAtm : Provider.DefaultShop
    console.warn(`Invalid provider: '${provider}'. Setting ${newProvider} provider. MapLocation: ${JSON.stringify(location)}`)
    return newProvider
  }
  else if (isAtm && providerRoot === Provider.DefaultShop) {
    return Provider.DefaultAtm
  }
  return providerRoot
}

export function parseLocation(location: MapLocation) {
  const isAtm = location.sells.length > 0

  location.provider = getProvider(location)

  // If the photo is not a URL, then it's a reference to Google Maps
  const hasPhotoUrl = location.photo?.startsWith('http')
  if (!hasPhotoUrl) {
    location.photo = location.photo
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${location.photo}&key=${useRuntimeConfig().public.googleMapKey}`
      : undefined
  }

  // Prioritize links in this order: 1. Google Maps -> 2. Instagram -> 3. Facebook
  location.linkTo = location.gmaps ? LocationLink.GMaps : location.instagram ? LocationLink.Instagram : location.facebook ? LocationLink.Facebook : undefined
  location.url = location.gmaps || location.instagram || location.facebook

  Object.assign(location, getCardConfiguration(location.provider)) // Assing all the keys from the asset to the location

  location.isAtm = isAtm
  location.isDark = location.theme === Theme.Dark
  location.isLight = location.theme === Theme.Light

  // Make the translation reactive in case user change language
  Object.defineProperty(location, 'category_label', {
    get: () => useTranslations().translateCategory(location.category),
  })
  return location
}

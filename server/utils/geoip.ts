export interface LatLng {
  lat: number
  lng: number
}

export interface GeoIpResponse {
  location?: {
    longitude?: number
    latitude?: number
  }
  country?: string
  city?: string
  city_names?: { [language: string]: string }
}

export async function locateByHost(host?: string): Promise<LatLng> {
  const url = new URL(`https://geoip.nimiq-network.com:8443/v1/locate`)
  if (host)
    url.searchParams.set('host', host)

  const res = await $fetch<GeoIpResponse>(url.href)
  const { location } = res

  if (!location || !location.latitude || !location.longitude)
    throw new Error('Invalid GeoIP response')

  return { lat: location.latitude, lng: location.longitude }
}

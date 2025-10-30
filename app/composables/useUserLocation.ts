import type { Point } from '~/types/geo'

interface GeoIpResponse {
  location?: {
    longitude?: number
    latitude?: number
  }
  country?: string
  city?: string
}

const LUGANO_LOCATION: Point = { lng: 8.95606, lat: 46.00503 }

export function useUserLocation() {
  const route = useRoute()
  const shouldUseLugano = useLocalStorage('use-lugano-location', true)

  const queryLat = route.query.lat ? Number(route.query.lat) : undefined
  const queryLng = route.query.lng ? Number(route.query.lng) : undefined
  const hasQueryParams = queryLat !== undefined && queryLng !== undefined

  // GeoIP location (only fetch if toggle is off and no query params)
  const shouldFetchGeoIp = computed(() => !hasQueryParams && !shouldUseLugano.value)
  const { data: geoIpData } = useFetch<GeoIpResponse>('https://geoip.nimiq-network.com:8443/v1/locate', {
    lazy: true,
    server: false,
    watch: [shouldFetchGeoIp],
  })

  const gpsPoint = ref<Point | null>(null)
  const { coords, resume, pause } = useGeolocation({ immediate: false })
  const isLocating = computed(() => coords.value.latitude === Number.POSITIVE_INFINITY)

  function locateMe() {
    resume()
    watchOnce(coords, (newCoords) => {
      if (newCoords.latitude && newCoords.longitude) {
        gpsPoint.value = { lng: newCoords.longitude, lat: newCoords.latitude }
      }
      pause()
    })
  }

  const point = computed<Point>(() => {
    // Priority 1: GPS (user clicked "locate me")
    if (gpsPoint.value)
      return gpsPoint.value

    // Priority 2: URL query params
    if (hasQueryParams)
      return { lng: queryLng!, lat: queryLat! }

    // Priority 3: Lugano toggle on
    if (shouldUseLugano.value)
      return LUGANO_LOCATION

    // Priority 4: GeoIP
    if (geoIpData.value?.location?.latitude && geoIpData.value?.location?.longitude)
      return { lng: geoIpData.value.location.longitude, lat: geoIpData.value.location.latitude }

    // Fallback: Lugano
    return LUGANO_LOCATION
  })

  return {
    point,
    shouldUseLugano,
    hasQueryParams,
    isLocating,
    locateMe,
  }
}

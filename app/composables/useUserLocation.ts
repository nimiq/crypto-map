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
const LUGANO_ACCURACY = 50 // meters - simulated accuracy for testing

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
  const gpsAccuracy = ref<number | null>(null)
  const isLocating = ref(false)
  const { coords, resume, pause } = useGeolocation({ immediate: false })

  const ACCURACY_THRESHOLD = 100 // meters - only show blue dot if accuracy is better than this

  function locateMe() {
    isLocating.value = true
    resume()
    watchOnce(coords, (newCoords) => {
      if (newCoords.latitude && newCoords.longitude) {
        gpsPoint.value = { lng: newCoords.longitude, lat: newCoords.latitude }
        gpsAccuracy.value = newCoords.accuracy
      }
      isLocating.value = false
      pause()
    })
  }

  const showUserLocation = computed(() => {
    // Show for actual GPS location with good accuracy
    if (gpsPoint.value !== null && gpsAccuracy.value !== null && gpsAccuracy.value <= ACCURACY_THRESHOLD) {
      return true
    }
    // Also show for Lugano location (for testing)
    if (shouldUseLugano.value && !gpsPoint.value) {
      return true
    }
    return false
  })

  const userLocationPoint = computed(() => {
    if (gpsPoint.value && gpsAccuracy.value !== null && gpsAccuracy.value <= ACCURACY_THRESHOLD) {
      return gpsPoint.value
    }
    if (shouldUseLugano.value && !gpsPoint.value) {
      return LUGANO_LOCATION
    }
    return null
  })

  const userLocationAccuracy = computed(() => {
    if (gpsPoint.value && gpsAccuracy.value !== null && gpsAccuracy.value <= ACCURACY_THRESHOLD) {
      return gpsAccuracy.value
    }
    if (shouldUseLugano.value && !gpsPoint.value) {
      return LUGANO_ACCURACY
    }
    return null
  })

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

  const source = computed<'gps' | 'query' | 'lugano' | 'geoip' | 'fallback'>(() => {
    if (gpsPoint.value)
      return 'gps'
    if (hasQueryParams)
      return 'query'
    if (shouldUseLugano.value)
      return 'lugano'
    if (geoIpData.value?.location?.latitude && geoIpData.value?.location?.longitude)
      return 'geoip'
    return 'fallback'
  })

  return {
    point,
    source,
    shouldUseLugano,
    hasQueryParams,
    isLocating,
    locateMe,
    gpsPoint,
    gpsAccuracy,
    showUserLocation,
    userLocationPoint,
    userLocationAccuracy,
  }
}

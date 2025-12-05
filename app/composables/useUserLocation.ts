import type { Point } from '~/types/geo'

interface NimiqGeoIpResponse {
  location?: { longitude: string, latitude: string, accuracy_radius: number }
  country?: string
  city?: string
}

export function useUserLocation() {
  const route = useRoute()

  const queryLat = route.query.lat ? Number(route.query.lat) : undefined
  const queryLng = route.query.lng ? Number(route.query.lng) : undefined
  const hasQueryParams = queryLat !== undefined && queryLng !== undefined

  // Nimiq GeoIP (client-side fetch)
  const ipPoint = ref<Point | null>(null)
  const ipAccuracy = ref<number | null>(null) // in meters
  const ipCountry = ref<string | null>(null)
  const ipGeoStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

  async function fetchIpGeolocation() {
    if (ipGeoStatus.value !== 'idle')
      return
    ipGeoStatus.value = 'pending'

    try {
      const response = await fetch('https://geoip.nimiq-network.com:8443/v1/locate')
      const json: NimiqGeoIpResponse = await response.json()

      if (json?.location?.latitude && json?.location?.longitude) {
        ipPoint.value = {
          lat: Number.parseFloat(json.location.latitude),
          lng: Number.parseFloat(json.location.longitude),
        }
        ipAccuracy.value = (json.location.accuracy_radius || 300) * 1000 // km -> meters
        ipCountry.value = json.country || null
        ipGeoStatus.value = 'success'
      }
      else {
        ipGeoStatus.value = 'error'
      }
    }
    catch {
      ipGeoStatus.value = 'error'
    }
  }

  // Auto-fetch on client
  if (import.meta.client) {
    fetchIpGeolocation()
  }

  const isGeoReady = computed(() => ipGeoStatus.value === 'success' || ipGeoStatus.value === 'error')

  const gpsPoint = ref<Point | null>(null)
  const gpsAccuracy = ref<number | null>(null)
  const isLocating = ref(false)
  const { coords, resume, pause } = useGeolocation({ immediate: false })

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

  // Show blue dot when GPS location is available (accuracy circle indicates precision)
  const showUserLocation = computed(() => {
    return gpsPoint.value !== null && gpsAccuracy.value !== null
  })

  const userLocationPoint = computed(() => {
    if (showUserLocation.value)
      return gpsPoint.value
    return null
  })

  const userLocationAccuracy = computed(() => {
    if (showUserLocation.value)
      return gpsAccuracy.value
    return null
  })

  // Initial map center point (for centering map, not for blue dot)
  const initialPoint = computed<Point | null>(() => {
    if (hasQueryParams)
      return { lng: queryLng!, lat: queryLat! }
    if (ipPoint.value)
      return ipPoint.value
    return null
  })

  // Accuracy for initial zoom calculation (only from IP geolocation)
  const initialAccuracy = computed<number | null>(() => {
    if (hasQueryParams)
      return null // Query params don't have accuracy
    return ipAccuracy.value
  })

  const source = computed<'gps' | 'query' | 'nimiq-geoip' | 'none'>(() => {
    if (gpsPoint.value)
      return 'gps'
    if (hasQueryParams)
      return 'query'
    if (ipPoint.value)
      return 'nimiq-geoip'
    return 'none'
  })

  return {
    initialPoint,
    initialAccuracy,
    isGeoReady,
    source,
    hasQueryParams,
    isLocating,
    locateMe,
    gpsPoint,
    gpsAccuracy,
    showUserLocation,
    userLocationPoint,
    userLocationAccuracy,
    ipCountry,
  }
}

import type { Point } from '~/types/geo'

export function useUserLocation() {
  const route = useRoute()

  const queryLat = route.query.lat ? Number(route.query.lat) : undefined
  const queryLng = route.query.lng ? Number(route.query.lng) : undefined
  const hasQueryParams = queryLat !== undefined && queryLng !== undefined

  // Cloudflare geolocation (city-level accuracy)
  const { data: cfGeo, status: cfGeoStatus } = useFetch<{ lat: number | null, lng: number | null }>('/api/geolocation', { lazy: true, server: false })
  const isGeoReady = computed(() => cfGeoStatus.value === 'success' || cfGeoStatus.value === 'error')

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

  // Show blue dot only for GPS location with good accuracy
  const showUserLocation = computed(() => {
    return gpsPoint.value !== null && gpsAccuracy.value !== null && gpsAccuracy.value <= ACCURACY_THRESHOLD
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
    // Priority 1: URL query params
    if (hasQueryParams)
      return { lng: queryLng!, lat: queryLat! }

    // Priority 2: Cloudflare geolocation
    if (cfGeo.value?.lat && cfGeo.value?.lng)
      return { lng: cfGeo.value.lng, lat: cfGeo.value.lat }

    // No initial location available
    return null
  })

  const source = computed<'gps' | 'query' | 'cloudflare' | 'none'>(() => {
    if (gpsPoint.value)
      return 'gps'
    if (hasQueryParams)
      return 'query'
    if (cfGeo.value?.lat && cfGeo.value?.lng)
      return 'cloudflare'
    return 'none'
  })

  return {
    initialPoint,
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
  }
}

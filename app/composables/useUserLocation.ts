import type { Point } from '~/types/geo'

interface NimiqGeoIpResponse {
  location?: { longitude: string, latitude: string, accuracy_radius: number }
  country?: string
  city?: string
}

// Module-level shared state (singleton across all components)
const ipPoint = ref<Point | null>(null)
const ipAccuracy = ref<number | null>(null)
const ipCountry = ref<string | null>(null)
const ipGeoStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

const gpsPoint = ref<Point | null>(null)
const gpsAccuracy = ref<number | null>(null)
const isLocating = ref(false)

// Shared useGeolocation instance (lazy initialized)
let geoInstance: ReturnType<typeof useGeolocation> | null = null
function getGeoInstance() {
  if (!geoInstance)
    geoInstance = useGeolocation({ immediate: false })
  return geoInstance
}

async function fetchIpGeolocation() {
  if (ipGeoStatus.value !== 'idle')
    return
  ipGeoStatus.value = 'pending'

  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 5000)
    const response = await fetch('https://geoip.nimiq-network.com:8443/v1/locate', { signal: controller.signal })
    clearTimeout(id)
    const json: NimiqGeoIpResponse = await response.json()

    if (json?.location?.latitude && json?.location?.longitude) {
      ipPoint.value = { lat: Number.parseFloat(json.location.latitude), lng: Number.parseFloat(json.location.longitude) }
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

// Auto-fetch on client (only runs once due to ipGeoStatus check)
if (import.meta.client) {
  fetchIpGeolocation()
}

// Parse #@lat,lng,zoomz format from hash (e.g., #@55.8334602,13.23455,16z)
function parseMapHash(hash: string): { lat?: number, lng?: number, zoom?: number, bearing?: number, pitch?: number } {
  // Match: #@lat,lng,zoomz or #@lat,lng,zoomz,bearingb,pitchp
  const match = hash.match(/^#@(-?\d+(?:\.\d*)?),(-?\d+(?:\.\d*)?),(\d+(?:\.\d*)?)z(?:,(\d+(?:\.\d*)?)b)?(?:,(\d+(?:\.\d*)?)p)?/)
  if (!match || !match[1] || !match[2] || !match[3])
    return {}
  return {
    lat: Number.parseFloat(match[1]),
    lng: Number.parseFloat(match[2]),
    zoom: Number.parseFloat(match[3]),
    bearing: match[4] ? Number.parseFloat(match[4]) : undefined,
    pitch: match[5] ? Number.parseFloat(match[5]) : undefined,
  }
}

export function useUserLocation() {
  const route = useRoute()

  // Parse hash format #@lat,lng,zoomz
  const hashParams = computed(() => parseMapHash(route.hash))
  const queryLat = computed(() => hashParams.value.lat)
  const queryLng = computed(() => hashParams.value.lng)
  const queryZoom = computed(() => hashParams.value.zoom)
  const queryBearing = computed(() => hashParams.value.bearing)
  const queryPitch = computed(() => hashParams.value.pitch)
  const hasQueryParams = computed(() => queryLat.value !== undefined && queryLng.value !== undefined)

  const isGeoReady = computed(() => ipGeoStatus.value === 'success' || ipGeoStatus.value === 'error')

  function locateMe() {
    const { coords, resume, pause } = getGeoInstance()
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
    if (hasQueryParams.value)
      return { lng: queryLng.value!, lat: queryLat.value! }
    if (ipPoint.value)
      return ipPoint.value
    return null
  })

  // Accuracy for initial zoom calculation (only from IP geolocation)
  const initialAccuracy = computed<number | null>(() => {
    if (hasQueryParams.value)
      return null // Path params don't have accuracy
    return ipAccuracy.value
  })

  const source = computed<'gps' | 'query' | 'nimiq-geoip' | 'none'>(() => {
    if (gpsPoint.value)
      return 'gps'
    if (hasQueryParams.value)
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
    queryZoom,
    queryBearing,
    queryPitch,
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

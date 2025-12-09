import { useDebounceFn } from '@vueuse/core'

// Parse #@lat,lng,zoomz format from hash
function parseMapHash(hash: string): { lat?: number, lng?: number, zoom?: number, bearing?: number, pitch?: number } {
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

// Build hash in #@lat,lng,zoomz format
function buildMapHash(lat: number, lng: number, zoom: number, bearing?: number, pitch?: number): string {
  const latStr = lat.toFixed(5)
  const lngStr = lng.toFixed(5)
  const zoomStr = zoom.toFixed(2).replace(/\.?0+$/, '')
  let hash = `#@${latStr},${lngStr},${zoomStr}z`
  if (bearing && bearing !== 0)
    hash += `,${bearing.toFixed(0)}b`
  if (pitch && pitch !== 0)
    hash += `,${pitch.toFixed(0)}p`
  return hash
}

function useMapUrlBase() {
  const router = useRouter()
  const route = useRoute()
  const { viewCenter, zoom, bearing, pitch, isInitialized, mapInstance } = useMapControls()

  // Prevent feedback loop: URL change → map move → URL change
  const isUpdatingFromMap = ref(false)

  // Parse hash params
  const hashParams = computed(() => parseMapHash(route.hash))
  const urlLat = computed(() => hashParams.value.lat)
  const urlLng = computed(() => hashParams.value.lng)
  const urlZoom = computed(() => hashParams.value.zoom)
  const urlBearing = computed(() => hashParams.value.bearing)
  const urlPitch = computed(() => hashParams.value.pitch)

  // Map → URL (debounced)
  const updateUrlFromMap = useDebounceFn(() => {
    if (!isInitialized.value)
      return
    isUpdatingFromMap.value = true

    const hash = buildMapHash(
      viewCenter.value.lat,
      viewCenter.value.lng,
      zoom.value,
      bearing.value,
      pitch.value,
    )

    router.replace({ hash, query: route.query }).finally(() => {
      nextTick(() => {
        isUpdatingFromMap.value = false
      })
    })
  }, 300)

  // Watch map state → update URL
  watch([viewCenter, zoom, bearing, pitch], () => {
    if (isInitialized.value && mapInstance.value)
      updateUrlFromMap()
  }, { deep: true })

  // URL → Map (external navigation / back-forward)
  watch([urlLat, urlLng, urlZoom, urlBearing, urlPitch], ([lat, lng, z, b, p]) => {
    if (isUpdatingFromMap.value)
      return
    if (!mapInstance.value || !isInitialized.value)
      return
    if (lat === undefined || lng === undefined)
      return

    const latDiff = Math.abs(viewCenter.value.lat - lat)
    const lngDiff = Math.abs(viewCenter.value.lng - lng)
    const posChanged = latDiff > 0.0001 || lngDiff > 0.0001
    const zoomChanged = z !== undefined && Math.abs(zoom.value - z) > 0.5
    const bearingChanged = b !== undefined && Math.abs(bearing.value - b) > 1
    const pitchChanged = p !== undefined && Math.abs(pitch.value - p) > 1

    if (posChanged || zoomChanged || bearingChanged || pitchChanged) {
      mapInstance.value.flyTo({
        center: [lng, lat],
        zoom: z ?? zoom.value,
        bearing: b ?? bearing.value,
        pitch: p ?? pitch.value,
        duration: 1000,
      })
    }
  })

  return { urlLat, urlLng, urlZoom, urlBearing, urlPitch }
}

export const useMapUrl = createSharedComposable(useMapUrlBase)

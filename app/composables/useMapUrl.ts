import { useDebounceFn } from '@vueuse/core'
import { buildMapHash, parseMapHash } from '~/utils/map-url'

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

import type { Map, PaddingOptions } from 'maplibre-gl'
import type { Point } from '~/types/geo'

const MIN_ZOOM = 3
const MAX_ZOOM = 15
const DEFAULT_ZOOM = 3 // World view when no location

// Calculate zoom level to fit a circle of given radius (in meters) within viewport
function calculateZoomForAccuracy(lat: number, accuracyMeters: number, viewportSize: number): number {
  // Earth's circumference at equator in meters
  const earthCircumference = 40075017
  // Adjust for latitude (circumference is smaller at higher latitudes)
  const metersPerPixelAtZoom0 = (earthCircumference * Math.cos(lat * Math.PI / 180)) / 256

  // We want the accuracy circle diameter to fit in viewport with some padding
  const targetPixels = viewportSize * 0.8 // 80% of viewport
  const diameterMeters = accuracyMeters * 2

  // At zoom Z, metersPerPixel = metersPerPixelAtZoom0 / 2^Z
  // We want: diameterMeters / metersPerPixel = targetPixels
  // So: diameterMeters * 2^Z / metersPerPixelAtZoom0 = targetPixels
  // 2^Z = targetPixels * metersPerPixelAtZoom0 / diameterMeters
  const zoom = Math.log2((targetPixels * metersPerPixelAtZoom0) / diameterMeters)

  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

function useMapControlsBase() {
  const mapInstance = ref<Map | null>(null)
  const { initialPoint, initialAccuracy, queryZoom, queryBearing, queryPitch } = useUserLocation()

  // Start with null center - will be set once we know optimal zoom
  const initialCenter = ref<[number, number] | null>(null)
  const initialZoom = ref(DEFAULT_ZOOM)
  const isInitialized = ref(false)

  // Initial bearing/pitch from URL params
  const initialBearing = ref(0)
  const initialPitch = ref(0)

  // View center tracks current map position (for search API)
  const viewCenter = ref<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
  const zoom = ref(DEFAULT_ZOOM)
  const bearing = ref(0)
  const pitch = ref(0)

  // Initialize view based on IP geolocation accuracy (like main map's fitBounds)
  function initializeView(viewportWidth: number, viewportHeight: number) {
    if (isInitialized.value)
      return

    const point = initialPoint.value
    if (!point) {
      initialCenter.value = [0, 20] // Slightly north of equator
      initialZoom.value = DEFAULT_ZOOM
      isInitialized.value = true
      return
    }

    const accuracy = initialAccuracy.value
    initialCenter.value = [point.lng, point.lat]

    // Use URL zoom if provided, otherwise calculate from accuracy or use default
    const urlZoom = queryZoom.value
    if (urlZoom !== undefined && !Number.isNaN(urlZoom)) {
      initialZoom.value = urlZoom
    }
    else if (accuracy) {
      const minViewportSize = Math.min(viewportWidth, viewportHeight)
      initialZoom.value = calculateZoomForAccuracy(point.lat, accuracy, minViewportSize)
    }
    else {
      initialZoom.value = 10
    }

    // Set bearing/pitch from URL params
    const urlBearing = queryBearing.value
    const urlPitch = queryPitch.value
    initialBearing.value = urlBearing !== undefined && !Number.isNaN(urlBearing) ? urlBearing : 0
    initialPitch.value = urlPitch !== undefined && !Number.isNaN(urlPitch) ? urlPitch : 0

    isInitialized.value = true
  }

  function updateViewCenter(map: Map) {
    const c = map.getCenter()
    viewCenter.value = { lat: c.lat, lng: c.lng }
  }

  function setMapInstance(map: Map) {
    mapInstance.value = map

    map.on('rotate', () => {
      bearing.value = map.getBearing()
    })
    map.on('pitch', () => {
      pitch.value = map.getPitch()
    })
    map.on('moveend', () => {
      updateViewCenter(map)
    })

    bearing.value = map.getBearing()
    pitch.value = map.getPitch()
    updateViewCenter(map)

    map.on('zoom', () => {
      zoom.value = map.getZoom()
    })
    zoom.value = map.getZoom()
  }

  function zoomIn() {
    mapInstance.value?.zoomIn()
  }

  function zoomOut() {
    mapInstance.value?.zoomOut()
  }

  function flyTo(point: Point, options?: { zoom?: number, accuracyMeters?: number, padding?: PaddingOptions }) {
    const map = mapInstance.value
    if (!map)
      return

    let zoomLevel = options?.zoom ?? 16
    if (options?.accuracyMeters) {
      const container = map.getContainer()
      const minViewportSize = Math.min(container.clientWidth, container.clientHeight)
      zoomLevel = calculateZoomForAccuracy(point.lat, options.accuracyMeters, minViewportSize)
    }

    map.flyTo({ center: [point.lng, point.lat], zoom: zoomLevel, duration: 1000, ...(options?.padding && { padding: options.padding }) })
  }

  function resetNorth() {
    mapInstance.value?.easeTo({ bearing: 0, pitch: 0, duration: 500 })
  }

  const isRotated = computed(() => bearing.value !== 0 || pitch.value !== 0)

  return {
    mapInstance,
    initialCenter,
    initialZoom,
    initialBearing,
    initialPitch,
    isInitialized,
    initializeView,
    viewCenter,
    zoom,
    bearing,
    pitch,
    isRotated,
    setMapInstance,
    zoomIn,
    zoomOut,
    flyTo,
    resetNorth,
  }
}

export const useMapControls = createSharedComposable(useMapControlsBase)

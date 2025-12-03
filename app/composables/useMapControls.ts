import type { Map } from 'maplibre-gl'
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
  const { initialPoint, initialAccuracy } = useUserLocation()

  // Start with null center - will be set once we know optimal zoom
  const initialCenter = ref<[number, number] | null>(null)
  const initialZoom = ref(DEFAULT_ZOOM)
  const isInitialized = ref(false)

  // View center tracks current map position (for search API)
  const viewCenter = ref<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
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
    if (accuracy) {
      // Calculate zoom to fit the accuracy circle (like main map's fitBounds on accuracy circle)
      const minViewportSize = Math.min(viewportWidth, viewportHeight)
      const zoom = calculateZoomForAccuracy(point.lat, accuracy, minViewportSize)
      initialCenter.value = [point.lng, point.lat]
      initialZoom.value = zoom
    }
    else {
      // No accuracy (e.g., query params) - use reasonable default
      initialCenter.value = [point.lng, point.lat]
      initialZoom.value = 10
    }

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
  }

  function zoomIn() {
    mapInstance.value?.zoomIn()
  }

  function zoomOut() {
    mapInstance.value?.zoomOut()
  }

  function flyTo(point: Point, zoomLevel = 16) {
    mapInstance.value?.flyTo({ center: [point.lng, point.lat], zoom: zoomLevel, duration: 1000 })
  }

  function resetNorth() {
    mapInstance.value?.easeTo({ bearing: 0, pitch: 0, duration: 500 })
  }

  const isRotated = computed(() => bearing.value !== 0 || pitch.value !== 0)

  return {
    mapInstance,
    initialCenter,
    initialZoom,
    isInitialized,
    initializeView,
    viewCenter,
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

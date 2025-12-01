import type { Map } from 'maplibre-gl'
import type { Point } from '~/types/geo'

const DEFAULT_ZOOM = 3 // World view when no location

function useMapControlsBase() {
  const mapInstance = ref<Map | null>(null)
  const { initialPoint } = useUserLocation()

  // Start with null center - will be set once we know optimal zoom
  const initialCenter = ref<[number, number] | null>(null)
  const initialZoom = ref(DEFAULT_ZOOM)
  const isInitialized = ref(false)

  // View center tracks current map position (for search API)
  const viewCenter = ref<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
  const bearing = ref(0)
  const pitch = ref(0)

  // Fetch optimal zoom when we have a location
  async function initializeView(viewportWidth: number, viewportHeight: number) {
    if (isInitialized.value)
      return

    const point = initialPoint.value
    if (!point) {
      // No location - show world view
      initialCenter.value = [0, 20] // Slightly north of equator
      initialZoom.value = DEFAULT_ZOOM
      isInitialized.value = true
      return
    }

    try {
      const { zoom } = await $fetch<{ zoom: number }>('/api/locations/optimal-zoom', {
        query: { lat: point.lat, lng: point.lng, width: viewportWidth, height: viewportHeight },
      })
      initialCenter.value = [point.lng, point.lat]
      initialZoom.value = zoom
    }
    catch {
      // Fallback to default zoom at user location
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

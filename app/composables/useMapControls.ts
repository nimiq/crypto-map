import type { Map } from 'maplibre-gl'
import type { Point } from '~/types/geo'
import { computed, ref } from 'vue'

function useMapControlsBase() {
  const mapInstance = ref<Map | null>(null)
  const { point } = useUserLocation()

  const center = computed(() => [point.value.lng, point.value.lat] as [number, number])
  const zoom = ref(13)
  const bearing = ref(0)
  const pitch = ref(0)

  function setMapInstance(map: Map) {
    mapInstance.value = map
    
    // Track bearing and pitch changes
    map.on('rotate', () => {
      bearing.value = map.getBearing()
    })
    map.on('pitch', () => {
      pitch.value = map.getPitch()
    })
    
    // Initialize values
    bearing.value = map.getBearing()
    pitch.value = map.getPitch()
  }

  function zoomIn() {
    if (!mapInstance.value)
      return
    mapInstance.value.zoomIn()
  }

  function zoomOut() {
    if (!mapInstance.value)
      return
    mapInstance.value.zoomOut()
  }

  function flyTo(point: Point, zoomLevel = 16) {
    if (!mapInstance.value)
      return
    mapInstance.value.flyTo({
      center: [point.lng, point.lat],
      zoom: zoomLevel,
      duration: 1000,
    })
  }

  function resetNorth() {
    if (!mapInstance.value)
      return
    mapInstance.value.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 500,
    })
  }

  const isRotated = computed(() => bearing.value !== 0 || pitch.value !== 0)

  return {
    mapInstance,
    center,
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

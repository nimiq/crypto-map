import type { Map } from 'maplibre-gl'
import type { Point } from '~/types/geo'

function useMapControlsBase() {
  const mapInstance = ref<Map | null>(null)
  const { point } = useUserLocation()

  const center = computed(() => [point.value.lng, point.value.lat] as [number, number])
  const zoom = ref(13)

  function setMapInstance(map: Map) {
    mapInstance.value = map
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

  return {
    mapInstance,
    center,
    zoom,
    setMapInstance,
    zoomIn,
    zoomOut,
    flyTo,
  }
}

export const useMapControls = createSharedComposable(useMapControlsBase)

import type { MapGeoJSONFeature } from 'maplibre-gl'
import { useThrottleFn } from '@vueuse/core'

export interface ClusterInfo {
  lng: number
  lat: number
  pointCount: number
}

const useVisibleLocationsBase = createSharedComposable(() => {
  const { mapInstance } = useMapControls()
  const locationCount = ref(0) // Individual pins
  const clusterCount = ref(0) // Cluster circles
  const clusters = ref<ClusterInfo[]>([]) // All visible clusters with geo coords
  const visibleCount = computed(() => locationCount.value + clusterCount.value)
  const hasVisibleLocations = computed(() => visibleCount.value > 0)

  function doUpdateVisibleCount() {
    if (!mapInstance.value)
      return

    const map = mapInstance.value
    let locations = 0
    const clusterList: ClusterInfo[] = []

    try {
      if (map.getLayer('location-icon')) {
        const iconFeatures = map.queryRenderedFeatures(undefined, { layers: ['location-icon'] }) as MapGeoJSONFeature[]
        locations = iconFeatures.length
      }

      if (map.getLayer('location-clusters')) {
        const clusterFeatures = map.queryRenderedFeatures(undefined, { layers: ['location-clusters'] }) as MapGeoJSONFeature[]

        // Extract cluster info with geo coordinates (not screen coords)
        for (const feature of clusterFeatures) {
          if (feature?.geometry?.type === 'Point') {
            const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
            clusterList.push({
              lng: coords[0],
              lat: coords[1],
              pointCount: (feature.properties?.point_count as number) || 0,
            })
          }
        }
      }
    }
    catch {
      // Layers might not be ready yet
    }

    locationCount.value = locations
    clusterCount.value = clusterList.length
    clusters.value = clusterList
  }

  // Throttle updates during drag to avoid excessive re-renders
  const updateVisibleCount = useThrottleFn(doUpdateVisibleCount, 50)

  // Update on map move/zoom and when tiles load
  watch(mapInstance, (map) => {
    if (!map)
      return

    map.on('move', updateVisibleCount) // Update during drag for smooth bubble movement
    map.on('moveend', updateVisibleCount)
    map.on('zoomend', updateVisibleCount)
    map.on('sourcedata', (e) => {
      if (e.sourceId === 'locations' && e.isSourceLoaded) {
        updateVisibleCount()
      }
    })

    // Initial check after a short delay to ensure layers are ready
    setTimeout(updateVisibleCount, 500)
  }, { immediate: true })

  return { visibleCount, hasVisibleLocations, updateVisibleCount, locationCount, clusterCount, clusters }
})

export const useVisibleLocations = useVisibleLocationsBase

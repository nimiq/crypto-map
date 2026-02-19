<script setup lang="ts">
import type { Map, MapMouseEvent } from 'maplibre-gl'
import { consola } from 'consola'

const { t } = useI18n()

definePageMeta({
  layout: false,
})

const { query, category, autocompleteLocations, autocompleteGeo, autocompleteGeoWeak, categories, openNow } = useSearch()
const { initialCenter, initialZoom, initialBearing, initialPitch, isInitialized, initializeView, viewCenter, setMapInstance, mapInstance, flyTo } = useMapControls()
useMapUrl()
const { setSearchResults, setSelectedLocation, initializeLayers, updateUserLocation } = useMapIcons()
const { showUserLocation, userLocationPoint, userLocationAccuracy, isGeoReady, initialPoint, initialAccuracy, hasQueryParams } = useUserLocation()
const { width: windowWidth, height: windowHeight } = useWindowSize()

// Inline composable for map interaction handlers
function useMapInteractions(options: {
  onMarkerClick: (uuid: string, coordinates: [number, number]) => void
  onBackgroundClick: () => void
}) {
  const logger = consola.withTag('map')
  const MIN_CLUSTER_ZOOM = 9

  function handleClusterClick(map: Map, e: MapMouseEvent & { features?: GeoJSON.Feature[] }) {
    if (!e.features?.length)
      return
    const feature = e.features[0]
    if (!feature?.geometry || feature.geometry.type !== 'Point')
      return

    const { bbox_west, bbox_south, bbox_east, bbox_north } = feature.properties || {}
    const coordinates = feature.geometry.coordinates as [number, number]

    if (bbox_west != null && bbox_south != null && bbox_east != null && bbox_north != null) {
      const center: [number, number] = [(bbox_west + bbox_east) / 2, (bbox_south + bbox_north) / 2]
      const latDiff = Math.abs(bbox_north - bbox_south)
      const lngDiff = Math.abs(bbox_east - bbox_west)
      const maxDiff = Math.max(latDiff, lngDiff)
      const estimatedZoom = Math.log2(360 / maxDiff) - 1
      map.flyTo({ center, zoom: Math.max(MIN_CLUSTER_ZOOM, Math.min(estimatedZoom, 16)), duration: 800 })
    }
    else {
      map.flyTo({ center: coordinates, zoom: Math.max(MIN_CLUSTER_ZOOM, map.getZoom() + 3), duration: 800 })
    }
  }

  function handleLocationClick(map: Map, e: MapMouseEvent & { features?: GeoJSON.Feature[] }) {
    e.preventDefault()
    const feature = e.features?.[0]
    const uuid = feature?.properties?.uuid
    if (uuid && feature?.geometry?.type === 'Point') {
      const coords = feature.geometry.coordinates as [number, number]
      options.onMarkerClick(uuid, coords)
    }
  }

  function setupCursorHandlers(map: Map, layerId: string) {
    map.on('mouseenter', layerId, () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseleave', layerId, () => map.getCanvas().style.cursor = '')
  }

  function setupMapHandlers(map: Map) {
    map.on('click', () => options.onBackgroundClick())
    map.on('click', 'location-icon', e => handleLocationClick(map, e))
    map.on('click', 'location-clusters', e => handleClusterClick(map, e))
    setupCursorHandlers(map, 'location-icon')
    setupCursorHandlers(map, 'location-clusters')

    // Collapse attribution by default
    const attribButton = map.getContainer().querySelector('.maplibregl-ctrl-attrib-button') as HTMLElement
    attribButton?.click()
  }

  return { setupMapHandlers, logger }
}

const logger = consola.withTag('map')
// Initialize map immediately; don't block on GeoIP
watch(windowWidth, (w) => {
  if (!isInitialized.value && w > 0)
    initializeView(windowWidth.value, windowHeight.value)
}, { immediate: true })

// Fly to IP location once GeoIP resolves (if map already initialized without it)
watch([isGeoReady, mapInstance], ([ready, map]) => {
  if (ready && map && !hasQueryParams.value && initialPoint.value)
    flyTo(initialPoint.value, { accuracyMeters: initialAccuracy.value ?? undefined })
})

logger.info('Map page loaded')

const selectedLocationUuid = ref<string | null>(null)
const isDrawerOpen = ref(false)
const { origin } = useRequestURL()
const mapStyle = getMapStyle(origin)

// Watch for drawer closing to deselect location
watch(isDrawerOpen, (newValue) => {
  if (!newValue) {
    selectedLocationUuid.value = null
    if (mapInstance.value) {
      setSelectedLocation(mapInstance.value as any, null)
    }
  }
})

// Fetch search results when query/category changes
const { data: searchResults } = await useFetch<SearchLocationResponse[]>('/api/search', {
  query: computed(() => ({
    q: query.value || undefined,
    categories: categories.value,
    openNow: openNow.value || undefined,
    lat: viewCenter.value.lat,
    lng: viewCenter.value.lng,
  })),
  watch: [query, category, openNow],
  default: () => [],
})

// Update user location blue dot
watch([userLocationPoint, userLocationAccuracy, showUserLocation, mapInstance], ([point, accuracy, show, map]) => {
  if (!map)
    return

  if (show && point && accuracy) {
    logger.info('[Map] Updating user location:', { point, accuracy })
    updateUserLocation(map as any, point, accuracy)
  }
  else {
    updateUserLocation(map as any, null, null)
  }
})

// Style search results on map (all pins visible, search results get priority styling)
watch([searchResults, mapInstance], ([results, map]) => {
  logger.info('[Map] Search results watcher triggered:', { resultsCount: results?.length || 0, hasMap: !!map })

  if (!map)
    return

  try {
    if (!map.getLayer('location-icon')) {
      logger.warn('[Map] location-icon layer not found')
      return
    }

    if (!results || !Array.isArray(results) || results.length === 0) {
      // No search - reset to normal styling
      setSearchResults(map as any, null)
    }
    else {
      // Highlight search results (other pins still visible but lower priority)
      const uuids = results.map((r: SearchLocationResponse) => r.uuid)
      setSearchResults(map as any, uuids)
    }
  }
  catch (error) {
    logger.error('Error styling search results:', error)
  }
})

function handleNavigate(uuid: string | undefined, latitude: number, longitude: number) {
  if (uuid) {
    selectedLocationUuid.value = uuid
    isDrawerOpen.value = true

    if (mapInstance.value) {
      setSelectedLocation(mapInstance.value as any, uuid)
      flyTo({ lat: latitude, lng: longitude }, { zoom: 14, padding: { bottom: 450 } })
    }
  }
  else {
    flyTo({ lat: latitude, lng: longitude }, { zoom: 12 })
  }
}

function handleMarkerClick(uuid: string, coordinates: [number, number]) {
  logger.info('Marker clicked:', uuid)
  selectedLocationUuid.value = uuid
  isDrawerOpen.value = true
  if (mapInstance.value) {
    setSelectedLocation(mapInstance.value as any, uuid)
    // Pan to marker position with padding for drawer, maintaining current zoom
    flyTo({ lat: coordinates[1], lng: coordinates[0] }, { zoom: mapInstance.value.getZoom(), padding: { bottom: 450 } })
  }
}

function handleBackgroundClick() {
  selectedLocationUuid.value = null
  isDrawerOpen.value = false
  if (mapInstance.value) {
    setSelectedLocation(mapInstance.value as any, null)
  }
}

const { setupMapHandlers } = useMapInteractions({
  onMarkerClick: handleMarkerClick,
  onBackgroundClick: handleBackgroundClick,
})

async function onMapLoad(event: { map: Map }) {
  logger.info('onMapLoad called', event)
  try {
    const { map } = event
    if (!map) {
      logger.error('No map in event!')
      return
    }

    initializeLayers(map as any)
    setupMapHandlers(map)
    setMapInstance(map)
  }
  catch (error) {
    logger.error('Error initializing map:', error)
  }
}
</script>

<template>
  <main of-hidden h-dvh>
    <Search v-model:query="query" v-model:category="category" :autocomplete-locations :autocomplete-geo :autocomplete-geo-weak @navigate="handleNavigate" />
    <ClientOnly>
      <template #fallback>
        <div flex="~ items-center justify-center" bg-neutral-100 size-screen>
          <p text-neutral-700>
            {{ t('map.loading') }}
          </p>
        </div>
      </template>
      <div v-if="isInitialized && initialCenter" bg-red-100 size-screen>
        <MglMap
          :center="initialCenter"
          :zoom="initialZoom"
          :bearing="initialBearing"
          :pitch="initialPitch"
          :min-zoom="3"
          :map-style
          :attribution-control="false"
          @map:load="onMapLoad"
          @map:error="(e: any) => logger.error('Map error:', e.event?.error || e)"
        >
          <MglAttributionControl position="bottom-left" compact />
        </MglMap>
      </div>
    </ClientOnly>
    <MapControls />
    <CountryBubbles />
    <LocationCounter />
    <DevOnly><MapDebugPanel /></DevOnly>

    <LocationDrawer
      v-model:open="isDrawerOpen"
      :location-uuid="selectedLocationUuid"
      @update:location-uuid="(uuid) => {
        selectedLocationUuid = uuid
        if (!uuid && mapInstance) {
          const { setSelectedLocation } = useMapIcons()
          setSelectedLocation(mapInstance as any, null)
        }
      }"
    />
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}

/* Style compact attribution */
.maplibregl-ctrl-attrib {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  font-size: 10px;
}

.maplibregl-ctrl-attrib.maplibregl-compact {
  min-height: 24px;
  padding: 0;
  background: rgba(255, 255, 255, 0.9);
}

/* Start collapsed by default */
.maplibregl-ctrl-attrib.maplibregl-compact:not(.maplibregl-compact-show) .maplibregl-ctrl-attrib-inner {
  display: none;
}

.maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-button {
  background-color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231F2348'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'/%3E%3C/svg%3E");
  background-size: 18px;
  background-position: center;
  background-repeat: no-repeat;
}

.maplibregl-ctrl-attrib.maplibregl-compact-show {
  padding: 2px 28px 2px 8px;
  border-radius: 12px;
}
</style>

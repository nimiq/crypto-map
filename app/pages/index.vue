<script setup lang="ts">
import type { Map } from 'maplibre-gl'
import { consola } from 'consola'

const logger = consola.withTag('map')

definePageMeta({
  layout: false,
})

const { query, category, autocompleteLocations, autocompleteGeo, autocompleteGeoWeak, categories, openNow } = useSearch()
const { initialCenter, initialZoom, isInitialized, initializeView, viewCenter, setMapInstance, mapInstance, flyTo } = useMapControls()
const { setSearchResults, setSelectedLocation, initializeLayers, updateUserLocation } = useMapIcons()
const { showUserLocation, userLocationPoint, userLocationAccuracy, isGeoReady } = useUserLocation()
const { width: windowWidth, height: windowHeight } = useWindowSize()
// Initialize map view with accuracy-based zoom once IP geolocation resolves
watch([isGeoReady, windowWidth], () => {
  if (!isInitialized.value && isGeoReady.value && windowWidth.value > 0) {
    initializeView(windowWidth.value, windowHeight.value)
  }
}, { immediate: true })

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
    // Location result - open drawer
    selectedLocationUuid.value = uuid
    isDrawerOpen.value = true

    if (mapInstance.value) {
      setSelectedLocation(mapInstance.value as any, uuid)
      const bounds = mapInstance.value.getBounds()
      if (!bounds.contains([longitude, latitude])) {
        flyTo({ lat: latitude, lng: longitude }, 14)
      }
    }
  }
  else {
    // Geo result - just pan to location
    flyTo({ lat: latitude, lng: longitude }, 12)
  }
}

function handleMarkerClick(uuid: string) {
  logger.info('Marker clicked:', uuid)
  selectedLocationUuid.value = uuid
  isDrawerOpen.value = true

  // Highlight selected location on map
  if (mapInstance.value) {
    setSelectedLocation(mapInstance.value as any, uuid)
  }

  logger.info('Drawer state:', { isDrawerOpen: isDrawerOpen.value, selectedLocationUuid: selectedLocationUuid.value })
}

async function onMapLoad(event: { map: Map }) {
  logger.info('onMapLoad called', event)
  try {
    const { map } = event
    if (!map) {
      logger.error('No map in event!')
      return
    }

    // Initialize layers immediately
    initializeLayers(map as any)

    // Add click handler to map background - deselect location and collapse drawer
    map.on('click', (_e) => {
      // Clear selected location
      selectedLocationUuid.value = null
      isDrawerOpen.value = false
      setSelectedLocation(map as any, null)
    })

    // Add click handler to location icon layer
    map.on('click', 'location-icon', (e) => {
      e.preventDefault()
      if (!e.features || e.features.length === 0)
        return

      const feature = e.features[0]
      if (!feature)
        return
      const uuid = feature.properties?.uuid

      if (uuid) {
        handleMarkerClick(uuid)
      }
    })

    // Add click handler to cluster circles - zoom in
    map.on('click', 'location-clusters', (e) => {
      if (!e.features || e.features.length === 0)
        return

      const feature = e.features[0]
      if (!feature?.geometry || feature.geometry.type !== 'Point')
        return

      const coordinates = feature.geometry.coordinates as [number, number]
      const currentZoom = map.getZoom()

      // Zoom in by 3 levels to reveal clustered locations
      map.flyTo({
        center: coordinates,
        zoom: Math.min(currentZoom + 3, 18), // Cap at zoom 18
        duration: 800,
      })
    })

    // Change cursor on hover for individual locations
    map.on('mouseenter', 'location-icon', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'location-icon', () => {
      map.getCanvas().style.cursor = ''
    })

    // Change cursor on hover for clusters
    map.on('mouseenter', 'location-clusters', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'location-clusters', () => {
      map.getCanvas().style.cursor = ''
    })

    // Collapse attribution by default (maplibre expands it on init)
    const attribButton = map.getContainer().querySelector('.maplibregl-ctrl-attrib-button') as HTMLElement
    attribButton?.click()

    setMapInstance(map)
  }
  catch (error) {
    logger.error('Error initializing map:', error)
  }
}
</script>

<template>
  <main min-h-screen>
    <Search v-model:query="query" v-model:category="category" :autocomplete-locations :autocomplete-geo :autocomplete-geo-weak @navigate="handleNavigate" />
    <ClientOnly>
      <template #fallback>
        <div flex="~ items-center justify-center" bg-neutral-100 size-screen>
          <p text-neutral-700>
            Loading map...
          </p>
        </div>
      </template>
      <div v-if="isInitialized && initialCenter" bg-red-100 size-screen>
        <MglMap
          :center="initialCenter"
          :zoom="initialZoom"
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

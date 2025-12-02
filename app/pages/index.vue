<script setup lang="ts">
import type { Map } from 'maplibre-gl'
import { consola } from 'consola'

const logger = consola.withTag('map')

definePageMeta({
  layout: false,
})

const { query, category, autocompleteResults, categories, openNow } = useSearch()
const { initialCenter, initialZoom, isInitialized, initializeView, viewCenter, setMapInstance, mapInstance, flyTo } = useMapControls()
const { setSearchResults, setSelectedLocation, initializeLayers, updateUserLocation } = useMapIcons()
const { showUserLocation, userLocationPoint, userLocationAccuracy, initialPoint: _initialPoint, isGeoReady } = useUserLocation()
const { width: windowWidth, height: windowHeight } = useWindowSize()

// Initialize map view with optimal zoom once CF geolocation resolves
watch([isGeoReady, windowWidth], async () => {
  if (!isInitialized.value && isGeoReady.value && windowWidth.value > 0) {
    await initializeView(windowWidth.value, windowHeight.value)
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

// Filter map to show only search results and highlight them
watch([searchResults, mapInstance], ([results, map]) => {
  logger.info('[Map] Search results watcher triggered:', {
    resultsCount: results?.length || 0,
    hasMap: !!map,
    results: results?.map(r => ({ uuid: r.uuid, name: r.name })),
  })

  if (!map)
    return

  try {
    const iconLayer = map.getLayer('location-icon')
    if (!iconLayer) {
      logger.warn('[Map] location-icon layer not found')
      return
    }

    if (!results || !Array.isArray(results) || results.length === 0) {
      // No search - show all locations with normal styling
      logger.info('[Map] No search results - showing all locations')
      map.setFilter('location-icon', null)
      setSearchResults(map as any, null)
    }
    else {
      // Filter to show only search result UUIDs
      const uuids = results.map((r: SearchLocationResponse) => r.uuid)
      logger.info('[Map] Applying search filter:', { count: uuids.length, uuids })
      const filter = ['in', ['get', 'uuid'], ['literal', uuids]] as any
      map.setFilter('location-icon', filter)

      // Highlight all search results with active pins
      setSearchResults(map as any, uuids)
    }
  }
  catch (error) {
    logger.error('Error filtering map:', error)
  }
})

function handleNavigate(uuid: string, latitude: number, longitude: number) {
  // Open drawer
  selectedLocationUuid.value = uuid
  isDrawerOpen.value = true

  // Highlight on map and fly if outside view
  if (mapInstance.value) {
    setSelectedLocation(mapInstance.value as any, uuid)

    const bounds = mapInstance.value.getBounds()
    if (!bounds.contains([longitude, latitude])) {
      flyTo({ lat: latitude, lng: longitude }, 14)
    }
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

    setMapInstance(map)
  }
  catch (error) {
    logger.error('Error initializing map:', error)
  }
}
</script>

<template>
  <main min-h-screen>
    <Search v-model:query="query" v-model:category="category" :autocomplete-results @navigate="handleNavigate" />
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
          @map:load="onMapLoad"
          @map:error="(e: any) => logger.error('Map error:', e.event?.error || e)"
        >
          <template #default>
            <!-- Map loaded marker -->
          </template>
        </MglMap>
      </div>
    </ClientOnly>
    <MapControls />
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
</style>

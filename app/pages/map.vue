<script setup lang="ts">
import type { Map } from 'maplibre-gl'
import type { LocationDetailResponse, SearchLocationResponse } from '../../shared/types'
import { consola } from 'consola'
import { DrawerContent, DrawerOverlay, DrawerPortal, DrawerRoot } from 'vaul-vue'
import { getMapStyle } from '~/utils/map-style'

const logger = consola.withTag('map')

definePageMeta({
  layout: false,
})

const { query, category, autocompleteResults, categories, openNow } = useSearch()
const { center, zoom, setMapInstance, mapInstance } = useMapControls()

logger.info('Map page loaded - center:', center.value, 'zoom:', zoom.value)

const selectedLocationUuid = ref<string | null>(null)
const isDrawerOpen = ref(false)
const { origin } = useRequestURL()
const mapStyle = getMapStyle(origin)

const { data: selectedLocation } = useFetch<LocationDetailResponse>(
  () => `/api/locations/${selectedLocationUuid.value}`,
  {
    lazy: true,
    watch: [selectedLocationUuid],
    server: false,
    immediate: false,
    getCachedData: key => selectedLocationUuid.value ? undefined : null,
  },
)

// Fetch search results when query/category changes
const { data: searchResults } = await useFetch<SearchLocationResponse[]>('/api/search', {
  query: computed(() => ({
    q: query.value || undefined,
    categories: categories.value,
    openNow: openNow.value || undefined,
  })),
  watch: [query, category, openNow],
  default: () => [],
})

// Filter map to show only search results
watch([searchResults, mapInstance], ([results, map]) => {
  if (!map)
    return

  try {
    const dotLayer = map.getLayer('location-dot')
    if (!dotLayer)
      return

    if (!results || !Array.isArray(results) || results.length === 0) {
      // No search - show all locations
      map.setFilter('location-ring', null)
      map.setFilter('location-dot', null)
    }
    else {
      // Filter to show only search result UUIDs
      const uuids = results.map((r: SearchLocationResponse) => r.uuid)
      const filter = ['in', ['get', 'uuid'], ['literal', uuids]]
      map.setFilter('location-ring', filter)
      map.setFilter('location-dot', filter)
    }
  }
  catch (error) {
    logger.error('Error filtering map:', error)
  }
})

async function handleNavigate(uuid: string) {
  await navigateTo(`/location/${uuid}`)
}

function handleMarkerClick(uuid: string) {
  logger.info('Marker clicked:', uuid)
  selectedLocationUuid.value = uuid
  isDrawerOpen.value = true
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

    const { initializeLayers } = useMapIcons()

    // Initialize layers immediately
    initializeLayers(map)

    // Add click handler to location dots layer
    map.on('click', 'location-dot', (e) => {
      if (!e.features || e.features.length === 0)
        return

      const feature = e.features[0]
      const uuid = feature.properties?.uuid

      if (uuid) {
        handleMarkerClick(uuid)
      }
    })

    // Change cursor on hover
    map.on('mouseenter', 'location-dot', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'location-dot', () => {
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
    <header absolute z-1 top="12 md:16" left="12 md:16" right="12 md:16">
      <Search v-model:query="query" v-model:category="category" :autocomplete-results shadow-xl @navigate="handleNavigate" />
    </header>
    <ClientOnly>
      <template #fallback>
        <div flex="~ items-center justify-center" bg-neutral-100 size-screen>
          <p text-neutral-700>
            Loading map...
          </p>
        </div>
      </template>
      <div bg-red-100 size-screen>
        <MglMap
          :center
          :zoom
          :map-style
          @map:load="onMapLoad"
          @map:error="(e) => logger.error('Map error:', e.event?.error || e)"
        >
          <template #default>
            <!-- Map loaded marker -->
          </template>
        </MglMap>
      </div>
    </ClientOnly>
    <MapControls />
    <LocationCounter />

    <DrawerRoot v-model:open="isDrawerOpen">
      <DrawerPortal>
        <DrawerContent rounded-t-xl bg-white bottom-0 left-0 right-0 fixed z-50 @pointer-down-outside.prevent>
          <div v-if="selectedLocation" f-px-md f-py-lg>
            <button cursor-pointer right-8 top-8 absolute aria-label="Close" @click="isDrawerOpen = false">
              <Icon name="i-tabler:x" text-neutral-600 size-24 />
            </button>
            <h2 text="neutral-900 f-lg" font-bold m-0 f-mb-xs>
              {{ selectedLocation.name }}
            </h2>
            <p text="neutral-700 f-sm" m-0 f-mb-md>
              {{ selectedLocation.address }}
            </p>
            <NuxtLink :to="`/location/${selectedLocationUuid}`" nq-arrow nq-pill-blue>
              View details
            </NuxtLink>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </DrawerRoot>
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}
</style>

<script setup lang="ts">
import type { Map } from 'maplibre-gl'
import { consola } from 'consola'
import { DrawerContent, DrawerOverlay, DrawerPortal, DrawerRoot } from 'vaul-vue'

const logger = consola.withTag('map')

definePageMeta({
  layout: false,
})

const { query, category, autocompleteResults, categories, openNow } = useSearch()
const { center, zoom, setMapInstance, mapInstance } = useMapControls()

logger.info('Map page loaded - center:', center.value, 'zoom:', zoom.value)

const selectedLocationUuid = ref<string | null>(null)
const isDrawerOpen = ref(false)
// Snap points: compact (190px) and expanded (32px from top)
const snapPoints = ['190px', 'calc(100vh - 32px)']
const activeSnapPoint = ref<string | number>(snapPoints[0])
const { origin } = useRequestURL()
const mapStyle = getMapStyle(origin)

const locationUrl = computed(() =>
  selectedLocationUuid.value ? `/api/locations/${selectedLocationUuid.value}` : undefined,
)

const { data: selectedLocation } = useFetch<LocationDetailResponse>(locationUrl as any, {
  lazy: true,
  watch: [selectedLocationUuid],
  server: false,
})

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
    const iconLayer = map.getLayer('location-icon')
    if (!iconLayer)
      return

    if (!results || !Array.isArray(results) || results.length === 0) {
      // No search - show all locations
      map.setFilter('location-icon', null)
    }
    else {
      // Filter to show only search result UUIDs
      const uuids = results.map((r: SearchLocationResponse) => r.uuid)
      const filter = ['in', ['get', 'uuid'], ['literal', uuids]] as any
      map.setFilter('location-icon', filter)
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

    // Add click handler to location icon layer
    map.on('click', 'location-icon', (e) => {
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

    // Change cursor on hover
    map.on('mouseenter', 'location-icon', () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'location-icon', () => {
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

    <DrawerRoot v-model:open="isDrawerOpen" v-model:active-snap-point="activeSnapPoint" :snap-points="snapPoints" :should-scale-background="false" :modal="false" :dismissible="false" :snap-to-sequential-point="true">
      <DrawerPortal>
        <DrawerOverlay bg="black/20" inset-0 fixed z-40 />
        <DrawerContent
          class="drawer-content"
          flex="~ col" shadow="[0_-4px_24px_rgba(0,0,0,0.1)]" outline-none rounded-t-10 bg-white h-full inset-x-0 bottom-0 fixed z-50
        >
          <LocationDrawerContent
            v-if="selectedLocation"
            :key="selectedLocation.uuid"
            :location="selectedLocation as any"
            :is-expanded="activeSnapPoint === snapPoints[1]"
            @close="isDrawerOpen = false"
            @collapse="activeSnapPoint = snapPoints[0]"
            @expand="activeSnapPoint = snapPoints[1]"
          />
          <div v-else class="p-8 flex justify-center">
            <Icon name="i-nimiq:spinner" text="f-2xl neutral-500" />
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

/* Vaul drawer animations - iOS-style cubic bezier from Ionic Framework */
.drawer-content {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1) !important;
  will-change: transform;
}

[data-vaul-overlay] {
  transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1) !important;
}

/* Disable transitions during drag for immediate feedback */
.drawer-content[data-vaul-no-drag] {
  transition: none !important;
}
</style>

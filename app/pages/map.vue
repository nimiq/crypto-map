<script setup lang="ts">
import type { MapLibreEvent } from 'maplibre-gl'

definePageMeta({
  layout: false,
})

const { query, category, autocompleteResults } = useSearch()
const { center, zoom, setMapInstance } = useMapControls()

const selectedLocationUuid = ref<string | null>(null)
const isDrawerOpen = ref(false)

const { data: selectedLocation } = useFetch(() => `/api/locations/${selectedLocationUuid.value}`, {
  lazy: true,
  immediate: false,
  watch: [selectedLocationUuid],
})

async function handleNavigate(uuid: string) {
  await navigateTo(`/location/${uuid}`)
}

function handleMarkerClick(uuid: string) {
  selectedLocationUuid.value = uuid
  isDrawerOpen.value = true
}

async function onMapLoad(event: MapLibreEvent) {
  const map = event.target
  if (!map)
    return

  // Load Naka logo for markers
  const img = new Image(32, 32)
  img.src = '/providers/naka.svg'
  await new Promise((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
  })
  map.addImage('naka-logo', img)

  // Handle marker clicks
  map.on('click', 'locations', (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0]
      const uuid = feature.properties?.uuid
      if (uuid) {
        handleMarkerClick(uuid)
      }
    }
  })

  // Change cursor on hover
  map.on('mouseenter', 'locations', () => {
    map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'locations', () => {
    map.getCanvas().style.cursor = ''
  })

  setMapInstance(map)
}
</script>

<template>
  <main min-h-screen>
    <header absolute z-1 f-top-xs f-inset-x-xs>
      <Search v-model:query="query" v-model:category="category" :autocomplete-results shadow-xl @navigate="handleNavigate" />
    </header>
    <ClientOnly>
      <div size-screen>
        <MglMap :center :zoom :map-style @load="onMapLoad" />
      </div>
    </ClientOnly>
    <MapControls />

    <Drawer v-model:open="isDrawerOpen">
      <DrawerContent v-if="selectedLocation">
        <DrawerClose />
        <div f-px-md f-py-lg>
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
    </Drawer>
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}
</style>

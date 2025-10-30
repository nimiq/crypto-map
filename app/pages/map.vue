<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { query, category, autocompleteResults } = useSearch()
const { center, zoom, setMapInstance } = useMapControls()

async function handleNavigate(uuid: string) {
  await navigateTo(`/location/${uuid}`)
}

function onMapLoad(event: any) {
  const map = event.target
  if (map)
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
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}
</style>

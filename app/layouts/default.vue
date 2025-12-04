<script setup lang="ts">
const { query, category, autocompleteLocations, autocompleteGeo, autocompleteGeoWeak } = useSearch()

async function handleNavigate(uuid: string | undefined, latitude: number, longitude: number) {
  if (uuid) {
    await navigateTo(`/location/${uuid}`)
  }
  else {
    // Geo result - navigate to map at location
    await navigateTo(`/?lat=${latitude}&lng=${longitude}`)
  }
}
</script>

<template>
  <main f="$px-16/24" min-h-screen f-px-sm f-pt-md f-pb-2xl>
    <header>
      <Search
        v-model:query="query"
        v-model:category="category"
        :autocomplete-locations
        :autocomplete-geo
        :autocomplete-geo-weak
        @navigate="handleNavigate"
      />
    </header>

    <slot />
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}

/* Commented out: Background color change when input is focused */
/* body:has([data-reka-popper-content-wrapper]) main {
  --uno: bg-neutral-0;
} */
</style>

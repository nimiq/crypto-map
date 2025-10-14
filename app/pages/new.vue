<script setup lang="ts">
// Recently viewed tracking
const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed()

// Fetch carousel data
const { data: contextualPrimaryData } = useFetch('/api/locations?status=contextual-primary&limit=10')
const contextualPrimaryLocations = computed(() => contextualPrimaryData.value?.locations || [])
const contextualPrimaryMeta = computed(() => contextualPrimaryData.value?.contextual)
const { data: contextualSecondaryData } = useFetch('/api/locations?status=contextual-secondary&limit=10')
const contextualSecondaryLocations = computed(() => contextualSecondaryData.value?.locations || [])
const contextualSecondaryMeta = computed(() => contextualSecondaryData.value?.contextual)
const recentlyViewedUuids = computed(() => recentlyViewed.value.slice(0, 10).join(','))
const { data: recentlyViewedData } = useFetch(() => `/api/locations?uuids=${recentlyViewedUuids.value}`, {
  watch: [recentlyViewed],
  immediate: !!recentlyViewed.value.length,
})
const recentlyViewedLocations = computed(() => recentlyViewedData.value?.locations || [])

const filteredRecentlyViewed = computed(() => (recentlyViewedLocations.value || []).filter((loc): loc is NonNullable<typeof loc> => loc !== null && loc !== undefined))
</script>

<template>
  <main f-pt-md f-px-sm f="$px-16/24" min-h-screen>
    <header>
      <NewSearch />
    </header>


    <!-- Carousels View -->
    <div f-mt-md children:f-mt-sm>
      <!-- Recently Viewed Carousel -->
      <Carousel v-if="filteredRecentlyViewed && filteredRecentlyViewed.length > 0"
        :title="$t('carousels.recentlyViewed')" icon="i-tabler:history">
        <LocationCard v-for="location in filteredRecentlyViewed" :key="location.uuid" :location />
      </Carousel>

      <!-- Contextual Primary Carousel (time-based) -->
      <Carousel v-if="contextualPrimaryLocations && contextualPrimaryLocations.length > 0 && contextualPrimaryMeta"
        :title="$t(contextualPrimaryMeta.title)" :icon="contextualPrimaryMeta.icon">
        <LocationCard v-for="location in contextualPrimaryLocations" :key="location.uuid" :location />
      </Carousel>

      <!-- Contextual Secondary Carousel (time-based) -->
      <Carousel
        v-if="contextualSecondaryLocations && contextualSecondaryLocations.length > 0 && contextualSecondaryMeta"
        :title="$t(contextualSecondaryMeta.title)" :icon="contextualSecondaryMeta.icon">
        <LocationCard v-for="location in contextualSecondaryLocations" :key="location.uuid" :location />
      </Carousel>
    </div>

    <LanguageSelector />

  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}

body:has([data-reka-popper-content-wrapper]) main {
  --uno: bg-neutral-0;
}
</style>

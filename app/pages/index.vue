<script setup lang="ts">
const { refreshSearch } = useLocationSearch()

const selectedLocation = ref<{ uuid: string, name: string } | null>(null)

const { data: locationResult, pending: locationPending, refresh: refreshLocation } = useFetch(
  () => `/api/locations/${selectedLocation.value?.uuid}`,
  {
    transform: loc => ({
      ...loc,
      hoursStatus: getOpeningHoursStatus(loc),
    }),
    immediate: false,
  },
)

const { searchQuery, showAutocomplete, searchResults, searchPending } = useLocationSearch()

const locations = computed(() => selectedLocation.value ? locationResult.value ? [locationResult.value] : [] : searchResults.value)
const pending = computed(() => selectedLocation.value ? locationPending.value : searchPending.value)

function selectLocation(location: any) {
  selectedLocation.value = location
  showAutocomplete.value = false

  if (location) {
    searchQuery.value = location.name
    refreshLocation()
  }
  else {
    refreshSearch()
  }
}
</script>

<template>
  <div bg-neutral-100 h-screen relative overflow-hidden>
    <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 flex h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />
    <LanguageSelector />
    <div h-full overflow-y-auto f-py-xl>
      <div mx-auto relative z-1 f-px-xl>
        <h1 text="neutral-900 f-2xl" font-bold f-mb-xs>
          {{ $t('hero.title') }}
        </h1>
        <p text="neutral-600 f-md" f-mb-lg>
          {{ $t('hero.subtitle') }}
        </p>
        <SearchInput @select-location="selectLocation" />
        <SearchFilters />

        <div v-if="pending" grid="~ cols-1 sm:cols-2 lg:cols-3 gap-24" f-mt-xl>
          <LocationCardSkeleton v-for="i in 6" :key="`skeleton-${i}`" />
        </div>

        <div v-else grid="~ cols-1 sm:cols-2 lg:cols-3 gap-24" f-mt-xl>
          <LocationCard v-for="location in locations" :key="location.gmapsPlaceId" :location="location" />
        </div>
        <EmptyState v-if="!pending && (!locations || locations.length === 0)" />
      </div>
    </div>
  </div>
</template>

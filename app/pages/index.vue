<script setup lang="ts">
const { searchResults, searchPending, refreshSearch } = useLocationSearch()

type SelectedItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
const selectedItem = ref<SelectedItem>()

const { data: locationResult, pending: locationPending, refresh: refreshLocation } = useFetch(
  () => `/api/locations/${selectedItem.value?.kind === 'location' ? selectedItem.value.uuid : ''}`,
  {
    transform: (loc) => {
      if (!loc || !('openingHours' in loc))
        return loc
      return {
        ...loc,
        hoursStatus: getOpeningHoursStatus(loc),
      }
    },
    immediate: false,
  },
)

watch(selectedItem, (value) => {
  if (value?.kind === 'query') {
    refreshSearch()
  }
  else if (value?.kind === 'location') {
    refreshLocation()
  }
})

const locations = computed(() => {
  if (selectedItem.value?.kind === 'location') {
    return locationResult.value && 'gmapsPlaceId' in locationResult.value ? [locationResult.value] : []
  }
  return searchResults.value || []
})
const pending = computed(() => selectedItem.value?.kind === 'location' ? locationPending.value : searchPending.value)
</script>

<template>
  <div bg-neutral-100 min-h-screen relative>
    <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />
    <DevOnly>
      <LanguageSelector />
    </DevOnly>
    <div relative z-1 f-px-md f-py-md>
      <h1 text="neutral-900 f-xl" font-bold f-mb-2xs>
        {{ $t('hero.title') }}
      </h1>
      <p text="neutral-600 f-sm" f-mb-md>
        {{ $t('hero.subtitle') }}
      </p>
      <Search v-model="selectedItem" />

      <div v-if="pending" grid="~ cols-1 gap-12" f-mt-md>
        <LocationCardSkeleton v-for="i in 3" :key="`skeleton-${i}`" />
      </div>

      <div v-else-if="locations && locations.length > 0" grid="~ cols-1 gap-12" f-mt-md>
        <LocationCard v-for="location in locations" :key="location.gmapsPlaceId" :location="location" />
      </div>

      <EmptyState v-if="!pending && (!locations || locations.length === 0)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AnimatePresence } from 'motion-v'

const { searchResults, searchPending, refreshSearch } = useLocationSearch()

type SelectedItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
const selectedItem = ref<SelectedItem>()

// Recently viewed tracking
const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed()

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
    if (value.uuid) {
      addRecentlyViewed(value.uuid)
    }
  }
})

const locations = computed(() => {
  if (selectedItem.value?.kind === 'location') {
    return locationResult.value && 'gmapsPlaceId' in locationResult.value ? [locationResult.value] : []
  }
  return searchResults.value || []
})
const pending = computed(() => selectedItem.value?.kind === 'location' ? locationPending.value : searchPending.value)

const isSearchOpen = ref(false)

// Fetch categories and carousel data
const { data: categories } = useFetch('/api/categories')
const { data: openNowData } = useFetch('/api/locations?status=open&limit=10')
const openNowLocations = computed(() => openNowData.value?.locations || [])
const { data: popularData } = useFetch('/api/locations?status=popular&limit=10')
const popularLocations = computed(() => popularData.value?.locations || [])
const recentlyViewedUuids = computed(() => recentlyViewed.value.slice(0, 10).join(','))
const { data: recentlyViewedData } = useFetch(() => `/api/locations?uuids=${recentlyViewedUuids.value}`, {
  watch: [recentlyViewed],
  immediate: !!recentlyViewed.value.length,
})
const recentlyViewedLocations = computed(() => recentlyViewedData.value?.locations || [])

const filteredRecentlyViewed = computed(() => (recentlyViewedLocations.value || []).filter((loc): loc is NonNullable<typeof loc> => loc !== null && loc !== undefined))

// Show search results or carousels
const showCarousels = computed(() => !isSearchOpen.value && !selectedItem.value)
</script>

<template>
  <div bg-neutral-100 min-h-screen relative>
    <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />
    <LanguageSelector />
    <div relative z-1 f-p-md f="$px $px-min-24 $px-max-32">
      <div flex="~ items-center justify-between" f-mb-md>
        <h1 text="neutral-900 f-lg" font-bold>
          {{ $t('hero.title') }}
        </h1>
        <button type="button" flex="~ items-center justify-center" bg="neutral-200 hover:neutral-300" rounded-full size-40 transition-colors @click="isSearchOpen = !isSearchOpen">
          <Icon :name="isSearchOpen ? 'i-tabler:x' : 'i-tabler:search'" text-neutral-900 size-20 />
        </button>
      </div>
      <AnimatePresence>
        <Motion v-if="isSearchOpen" tag="div" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto', transition: { duration: 0.3 } }" :exit="{ opacity: 0, height: 0, transition: { duration: 0.3 } }">
          <p text="neutral-600 f-sm" f-mb-md>
            {{ $t('hero.subtitle') }}
          </p>
          <Search v-model="selectedItem" />
        </Motion>
      </AnimatePresence>

      <!-- Carousels View (when search is closed) -->
      <div v-if="showCarousels" f-mt-md>
        <!-- Open Now Carousel -->
        <Carousel v-if="openNowLocations && openNowLocations.length > 0" :title="$t('carousels.openNow')" icon="i-tabler:clock">
          <LocationCard v-for="location in openNowLocations" :key="location.uuid" :location="location" @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Popular Locations Carousel -->
        <Carousel v-if="popularLocations && popularLocations.length > 0" :title="$t('carousels.popular')" icon="i-tabler:star">
          <LocationCard v-for="location in popularLocations" :key="location.uuid" :location="location" @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Category-based Carousels (top 5 categories) -->
        <template v-if="categories && categories.length > 0">
          <Carousel v-for="category in categories.slice(0, 5)" :key="category.id" :title="$te(`categories.${category.id}`) ? $t(`categories.${category.id}`) : category.name" :icon="category.icon">
            <CategoryCarousel :category-id="category.id" @select="selectedItem = $event" />
          </Carousel>
        </template>

        <!-- Recently Viewed Carousel -->
        <Carousel v-if="filteredRecentlyViewed && filteredRecentlyViewed.length > 0" :title="$t('carousels.recentlyViewed')" icon="i-tabler:history">
          <LocationCard v-for="location in filteredRecentlyViewed" :key="location.uuid" :location="location" @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>
      </div>

      <!-- Search Results View -->
      <div v-if="!showCarousels">
        <div v-if="pending" grid="~ cols-1 gap-12" f-mt-md>
          <LocationCardSkeleton v-for="i in 3" :key="`skeleton-${i}`" />
        </div>

        <div v-else-if="locations && locations.length > 0" grid="~ cols-1 gap-12" f-mt-md>
          <LocationCard v-for="location in locations" :key="location.gmapsPlaceId" :location="location" />
        </div>

        <EmptyState v-if="!pending && (!locations || locations.length === 0)" />
      </div>
    </div>
  </div>
</template>

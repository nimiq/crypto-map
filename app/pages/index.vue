<script setup lang="ts">
import { AnimatePresence } from 'motion-v'

const { searchResults, searchPending, refreshSearch } = useLocationSearch()

const searchContainerRef = useTemplateRef('searchContainerRef')

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
const searchRef = useTemplateRef<{ focusInput: () => void }>('searchRef')

// Auto-focus input when search opens
watch(isSearchOpen, (open) => {
  if (open) {
    nextTick(() => searchRef.value?.focusInput())
  }
})

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

// Show carousels until there's a selected item (search results or location view)
const showCarousels = computed(() => !selectedItem.value)
</script>

<template>
  <div bg-neutral-100 min-h-screen relative>
    <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />
    <LanguageSelector />
    <div relative z-1 f-p-md f="$px $px-min-24 $px-max-32">
      <div flex="~ items-center" f-mb-md relative min-h-40>
        <Motion tag="h1" text="neutral-900 f-lg" font-bold :animate="{ opacity: isSearchOpen ? 0 : 1, transition: { duration: 0.2 } }" :style="{ pointerEvents: isSearchOpen ? 'none' : 'auto' }">
          {{ $t('hero.title') }}
        </Motion>

        <!-- Back arrow (outside outlined container) -->
        <AnimatePresence>
          <Motion v-if="isSearchOpen" key="back-arrow" tag="button" type="button" flex="~ items-center justify-center" size-20 absolute left-0 top="1/2" cursor-pointer :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0, transition: { delay: 0.15, duration: 0.2 } }" :exit="{ opacity: 0, x: -10, transition: { duration: 0.15 } }" style="transform: translateY(-50%); color: var(--colors-neutral-900)" @click="isSearchOpen = false">
            <Icon name="i-tabler:arrow-left" size-20 />
          </Motion>
        </AnimatePresence>

        <Motion tag="div" ref="searchContainerRef" class="search-container" absolute right-0 top-0 flex="~ items-center" of-hidden :animate="{ width: isSearchOpen ? 'calc(100% - 48px)' : '40px', borderRadius: isSearchOpen ? '0.125em' : '9999px', backgroundColor: isSearchOpen ? 'transparent' : 'var(--colors-neutral-200)', transition: { duration: 0.3, ease: 'easeOut' } }" :style="{ outline: isSearchOpen ? '1.5px solid var(--outline-color, var(--colors-neutral-500))' : '0px solid transparent' }">
          <button v-if="!isSearchOpen" type="button" flex="~ items-center justify-center" size-40 flex-shrink-0 transition-colors style="background: transparent" hocus:style="background: var(--colors-neutral-300)" @click="isSearchOpen = true">
            <Icon name="i-tabler:search" size-20 style="color: var(--colors-neutral-900)" />
          </button>

          <Motion v-if="isSearchOpen" tag="div" flex="~ items-center gap-8" w-full pl-12 :initial="{ opacity: 0 }" :animate="{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }">
            <Search ref="searchRef" v-model="selectedItem" flex-1 />
            <button type="button" flex="~ items-center justify-center" size-20 flex-shrink-0 transition-colors mr-12 style="color: var(--colors-neutral-900)" hocus:style="color: var(--colors-neutral-600)" @click="isSearchOpen = false">
              <Icon name="i-tabler:x" size-20 />
            </button>
          </Motion>
        </Motion>
      </div>

      <!-- Filters (absolutely positioned to prevent layout shift) -->
      <div relative min-h-40>
        <AnimatePresence>
          <Motion v-if="isSearchOpen" key="filters" tag="div" flex="~ wrap gap-8" absolute top-0 left-0 w-full :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.3 } }" :exit="{ opacity: 0, y: -10, transition: { duration: 0.15 } }">
            <Toggle v-model="openNow" font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs text-14 :style="{ outline: openNow ? '1.5px solid transparent' : '1.5px solid var(--colors-neutral-400)', background: openNow ? 'var(--colors-blue)' : 'var(--colors-neutral-100)', color: openNow ? 'var(--colors-white)' : 'var(--colors-neutral-800)' }">
              {{ $t('filters.openNow') }}
            </Toggle>
            <Toggle v-model="walkable" font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs text-14 :style="{ outline: walkable ? '1.5px solid var(--colors-blue)' : '1.5px solid var(--colors-neutral-400)', background: 'var(--colors-neutral-100)', color: 'var(--colors-neutral-800)' }">
              {{ $t('filters.walkableDistance') }}
            </Toggle>
          </Motion>
        </AnimatePresence>
      </div>

      <!-- Carousels View (when search is closed) -->
      <div v-if="showCarousels" f-mt-md>
        <!-- Recently Viewed Carousel -->
        <Carousel v-if="filteredRecentlyViewed && filteredRecentlyViewed.length > 0" :title="$t('carousels.recentlyViewed')" icon="i-tabler:history">
          <LocationCard v-for="location in filteredRecentlyViewed" :key="location.uuid" :location="location" w-140 @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Open Now Carousel -->
        <Carousel v-if="openNowLocations && openNowLocations.length > 0" :title="$t('carousels.openNow')" icon="i-tabler:clock">
          <LocationCard v-for="location in openNowLocations" :key="location.uuid" :location="location" w-140 @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Popular Locations Carousel -->
        <Carousel v-if="popularLocations && popularLocations.length > 0" :title="$t('carousels.popular')" icon="i-tabler:star">
          <LocationCard v-for="location in popularLocations" :key="location.uuid" :location="location" w-140 @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Category-based Carousels (top 5 categories) -->
        <template v-if="categories && categories.length > 0">
          <Carousel v-for="category in categories.slice(0, 5)" :key="category.id" :title="$te(`categories.${category.id}`) ? $t(`categories.${category.id}`) : category.name" :icon="category.icon">
            <CategoryCarousel :category-id="category.id" @select="selectedItem = $event" />
          </Carousel>
        </template>
      </div>

      <!-- Search Results View -->
      <div v-if="!showCarousels">
        <div v-if="pending" grid="~ cols-1 sm:cols-2 md:cols-3 lg:cols-4 gap-12" f-mt-md>
          <LocationCardSkeleton v-for="i in 6" :key="`skeleton-${i}`" />
        </div>

        <div v-else-if="locations && locations.length > 0" grid="~ cols-1 sm:cols-2 md:cols-3 lg:cols-4 gap-12" f-mt-md>
          <LocationCard v-for="location in locations" :key="location.gmapsPlaceId" :location="location" w-full />
        </div>

        <EmptyState v-if="!pending && (!locations || locations.length === 0)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  --outline-color: var(--colors-neutral-500);
  --nq-ease: cubic-bezier(0.25, 0, 0.15, 1);
  transition: outline-color 200ms var(--nq-ease), box-shadow 100ms var(--nq-ease);
}

.search-container:where(:hover, :focus-within) {
  --outline-color: color-mix(in oklch, var(--colors-blue) 30%, transparent);
}

.search-container:focus-within {
  --outline-color: var(--colors-blue);
}
</style>

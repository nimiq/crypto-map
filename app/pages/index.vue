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

// Filter states
const openNow = ref(false)
const walkable = ref(false)

// Auto-focus input when search opens
watch(isSearchOpen, (open) => {
  if (open) {
    nextTick(() => searchRef.value?.focusInput())
  }
})

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

// Show carousels until there's a selected item (search results or location view)
const showCarousels = computed(() => !selectedItem.value)
</script>

<template>
  <div bg-neutral-100 min-h-screen relative>
    <AnnouncementBanner />
    <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />
    <LanguageSelector />
    <div f="$px $px-min-24 $px-max-32" pt-32 relative z-1 f-p-md>
      <div flex="~ items-center" min-h-40 relative f-mb-md>
        <Motion tag="h1" text="neutral-900 f-lg" font-bold :animate="{ opacity: isSearchOpen ? 0 : 1, transition: { duration: 0.2 } }" :style="{ pointerEvents: isSearchOpen ? 'none' : 'auto' }">
          {{ $t('hero.title') }}
        </Motion>

        <!-- Back arrow (outside outlined container) -->
        <AnimatePresence>
          <Motion v-if="isSearchOpen" key="back-arrow" tag="button" type="button" flex="~ items-center justify-center" top="1/2" size-20 cursor-pointer left-0 absolute :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0, transition: { delay: 0.15, duration: 0.2 } }" :exit="{ opacity: 0, x: -10, transition: { duration: 0.15 } }" style="transform: translateY(-50%); color: var(--colors-neutral-900)" @click="isSearchOpen = false">
            <Icon name="i-tabler:arrow-left" size-20 />
          </Motion>
        </AnimatePresence>

        <Motion ref="searchContainerRef" tag="div" class="search-container" flex="~ items-center" right-0 top-0 absolute of-hidden :animate="{ width: isSearchOpen ? 'calc(100% - 48px)' : '40px', borderRadius: isSearchOpen ? '0.125em' : '9999px', backgroundColor: isSearchOpen ? 'transparent' : 'var(--colors-neutral-200)', transition: { duration: 0.3, ease: 'easeOut' } }" :style="{ outline: isSearchOpen ? '1.5px solid var(--outline-color, var(--colors-neutral-500))' : '0px solid transparent' }">
          <button v-if="!isSearchOpen" type="button" flex="~ items-center justify-center" flex-shrink-0 size-40 transition-colors style="background: transparent" hocus:style="background: var(--colors-neutral-300)" @click="isSearchOpen = true">
            <Icon name="i-tabler:search" size-20 style="color: var(--colors-neutral-900)" />
          </button>

          <Motion v-if="isSearchOpen" tag="div" flex="~ items-center gap-8" pl-12 w-full :initial="{ opacity: 0 }" :animate="{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }">
            <Search ref="searchRef" v-model="selectedItem" flex-1 />
            <button type="button" flex="~ items-center justify-center" mr-12 flex-shrink-0 size-20 transition-colors style="color: var(--colors-neutral-900)" hocus:style="color: var(--colors-neutral-600)" @click="isSearchOpen = false">
              <Icon name="i-tabler:x" size-20 />
            </button>
          </Motion>
        </Motion>
      </div>

      <!-- Filters (absolutely positioned to prevent layout shift) -->
      <div min-h-40 relative>
        <AnimatePresence>
          <Motion v-if="isSearchOpen" key="filters" tag="div" flex="~ wrap gap-8" w-full left-0 top-0 absolute :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.3 } }" :exit="{ opacity: 0, y: -10, transition: { duration: 0.15 } }">
            <Toggle v-model="openNow" text-14 font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs :style="{ outline: openNow ? '1.5px solid transparent' : '1.5px solid var(--colors-neutral-400)', background: openNow ? 'var(--colors-blue)' : 'var(--colors-neutral-100)', color: openNow ? 'var(--colors-white)' : 'var(--colors-neutral-800)' }">
              {{ $t('filters.openNow') }}
            </Toggle>
            <Toggle v-model="walkable" text-14 font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs :style="{ outline: walkable ? '1.5px solid var(--colors-blue)' : '1.5px solid var(--colors-neutral-400)', background: 'var(--colors-neutral-100)', color: 'var(--colors-neutral-800)' }">
              {{ $t('filters.walkableDistance') }}
            </Toggle>
          </Motion>
        </AnimatePresence>
      </div>

      <!-- Carousels View (when search is closed) -->
      <div v-if="showCarousels" f-mt-md f-space-y-lg>
        <!-- Recently Viewed Carousel -->
        <Carousel v-if="filteredRecentlyViewed && filteredRecentlyViewed.length > 0" :title="$t('carousels.recentlyViewed')" icon="i-tabler:history">
          <LocationCard v-for="location in filteredRecentlyViewed" :key="location.uuid" :location="location" w-140 @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Contextual Primary Carousel (time-based) -->
        <Carousel v-if="contextualPrimaryLocations && contextualPrimaryLocations.length > 0 && contextualPrimaryMeta" :title="$t(contextualPrimaryMeta.title)" :icon="contextualPrimaryMeta.icon">
          <LocationCard v-for="location in contextualPrimaryLocations" :key="location.uuid" :location="location" w-140 @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>

        <!-- Contextual Secondary Carousel (time-based) -->
        <Carousel v-if="contextualSecondaryLocations && contextualSecondaryLocations.length > 0 && contextualSecondaryMeta" :title="$t(contextualSecondaryMeta.title)" :icon="contextualSecondaryMeta.icon">
          <LocationCard v-for="location in contextualSecondaryLocations" :key="location.uuid" :location="location" w-140 @click="selectedItem = { kind: 'location', uuid: location.uuid, name: location.name }" />
        </Carousel>
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
  transition:
    outline-color 200ms var(--nq-ease),
    box-shadow 100ms var(--nq-ease);
}

.search-container:where(:hover, :focus-within) {
  --outline-color: color-mix(in oklch, var(--colors-blue) 30%, transparent);
}

.search-container:focus-within {
  --outline-color: var(--colors-blue);
}
</style>

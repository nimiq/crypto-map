<script setup lang="ts">
const { searchResults, searchPending, refreshSearch, searchQuery } = useLocationSearch()

type SelectedItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
const selectedItem = ref<SelectedItem>()

// Recently viewed tracking
const { recentlyViewed, addRecentlyViewed } = useRecentlyViewed()

const isSearchFocused = ref(false)
const searchRef = useTemplateRef<{ focusInput: () => void }>('searchRef')

// Filter states
const { openNow } = useSearchFilters()

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
    // Keep overlay open to show results
  }
  else if (value?.kind === 'location') {
    refreshLocation()
    if (value.uuid) {
      addRecentlyViewed(value.uuid)
    }
    // Keep overlay open to show location
  }
})

const locations = computed(() => {
  if (selectedItem.value?.kind === 'location') {
    return locationResult.value && 'gmapsPlaceId' in locationResult.value ? [locationResult.value] : []
  }
  return searchResults.value || []
})
const pending = computed(() => selectedItem.value?.kind === 'location' ? locationPending.value : searchPending.value)

// Auto-focus input when search opens
watch(isSearchFocused, (focused) => {
  if (focused) {
    nextTick(() => searchRef.value?.focusInput())
  }
})

function handleBack() {
  isSearchFocused.value = false
  searchQuery.value = ''
  selectedItem.value = undefined
}

function clearQuery() {
  searchQuery.value = ''
  selectedItem.value = undefined
}

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
  <div bg-neutral-100 min-h-screen relative>
    <!-- Home View (Default) -->
    <div v-if="!isSearchFocused">
      <AnnouncementBanner />
      <NuxtImg src="/assets/lugano.svg" alt="Lugano" mx-auto op-3 h-auto w-full pointer-events-none items-end bottom-0 left-0 right-0 absolute z-0 />
      <LanguageSelector />
      <div f="$px-24/32" pt-32 relative z-1 f-py-xs>
        <div flex="~ items-center justify-between" min-h-40 f-mb-md>
          <h1 text="neutral-900 f-lg" font-bold>
            {{ $t('hero.title') }}
          </h1>
          <button type="button" flex="~ items-center justify-center" rounded-full size-40 cursor-pointer transition-colors style="background: var(--colors-neutral-200)" hocus:style="background: var(--colors-neutral-300)" @click="isSearchFocused = true">
            <Icon name="i-tabler:search" size-20 style="color: var(--colors-neutral-900)" />
          </button>
        </div>

        <!-- Carousels View -->
        <div f-mt-md children:not-first:f-mt-lg>
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
      </div>
    </div>

    <!-- Full Screen Search Overlay -->
    <div v-if="isSearchFocused" bg-white inset-0 fixed z-50>
      <div flex="~ col" h-full>
        <!-- Search Header -->
        <div flex="~ items-center gap-12" f="$px-24/32" pb-16 pt-32 style="border-bottom: 1px solid var(--colors-neutral-200)">
          <button type="button" flex="~ items-center justify-center" flex-shrink-0 size-40 cursor-pointer @click="handleBack">
            <Icon name="i-tabler:arrow-left" size-24 style="color: var(--colors-neutral-900)" />
          </button>

          <div flex="~ items-center" flex-1 relative>
            <Search ref="searchRef" v-model="selectedItem" />
          </div>

          <button v-if="searchQuery?.trim().length > 0" type="button" flex="~ items-center justify-center" flex-shrink-0 size-40 cursor-pointer @click="clearQuery">
            <Icon name="i-tabler:x" size-24 style="color: var(--colors-neutral-900)" />
          </button>
        </div>

        <!-- Filter Pills -->
        <div flex="~ wrap gap-8" f="$px-24/32" py-16 style="border-bottom: 1px solid var(--colors-neutral-200)">
          <button type="button" text-14 font-medium px-16 py-8 rounded-full cursor-pointer transition-colors :style="{ outline: openNow ? '1.5px solid transparent' : '1.5px solid var(--colors-neutral-400)', background: openNow ? 'var(--colors-blue)' : 'var(--colors-neutral-100)', color: openNow ? 'var(--colors-white)' : 'var(--colors-neutral-800)' }" @click="openNow = !openNow">
            {{ $t('filters.openNow') }}
          </button>
          <button type="button" text-14 font-medium px-16 py-8 rounded-full cursor-pointer transition-colors :style="{ outline: '1.5px solid var(--colors-neutral-400)', background: 'var(--colors-neutral-100)', color: 'var(--colors-neutral-800)' }">
            {{ $t('filters.restaurants') }}
          </button>
        </div>

        <!-- Search Content Area -->
        <div f="$px-24/32" py-16 flex-1 of-auto>
          <!-- Prompt to start typing -->
          <div v-if="searchQuery?.trim().length === 0" text="neutral-600 f-sm">
            {{ $t('search.startTyping') }}
          </div>

          <!-- Loading skeleton -->
          <div v-else-if="pending" grid="~ cols-1 sm:cols-2 md:cols-3 lg:cols-4 gap-12">
            <LocationCardSkeleton v-for="i in 8" :key="`skeleton-${i}`" />
          </div>

          <!-- Search results grid -->
          <div v-else-if="locations && locations.length > 0" grid="~ cols-1 sm:cols-2 md:cols-3 lg:cols-4 gap-12">
            <LocationCard v-for="location in locations" :key="location.gmapsPlaceId" :location="location" w-full />
          </div>

          <!-- Empty state -->
          <EmptyState v-else-if="!pending && (!locations || locations.length === 0)" />
        </div>
      </div>
    </div>
  </div>
</template>

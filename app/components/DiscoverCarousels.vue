<script setup lang="ts">
const { filteredRecentlyViewed } = useRecentlyViewed()
const {
  contextualPrimaryLocations,
  contextualPrimaryMeta,
  contextualSecondaryLocations,
  contextualSecondaryMeta,
} = useContextualCarousels()
const { setCategories, nearMe, openNow } = useSearch()
const { getLeafCategories } = useCategoryHierarchy()

const showRecentlyViewed = computed(
  () => filteredRecentlyViewed.value && filteredRecentlyViewed.value.length > 0,
)
const showPrimaryCarousel = computed(
  () =>
    contextualPrimaryLocations.value
    && contextualPrimaryLocations.value.length > 0
    && contextualPrimaryMeta.value,
)
const showSecondaryCarousel = computed(
  () =>
    contextualSecondaryLocations.value
    && contextualSecondaryLocations.value.length > 0
    && contextualSecondaryMeta.value,
)

async function handleLoadMore(categories: string[]) {
  // Filter to only leaf categories (most specific ones)
  const leafCategories = await getLeafCategories(categories)
  setCategories(leafCategories)
  // Enable both "Near me" and "Open now" filters by default
  nearMe.value = true
  openNow.value = true
}
</script>

<template>
  <div children:f-mt-sm>
    <Carousel
      v-if="showRecentlyViewed"
      :title="$t('carousels.recentlyViewed')"
      icon="i-tabler:history"
    >
      <LocationCard
        v-for="location in filteredRecentlyViewed"
        :key="location.uuid"
        :location
      />
    </Carousel>

    <Carousel
      v-if="showPrimaryCarousel"
      :title="$t(contextualPrimaryMeta!.title)"
      :icon="contextualPrimaryMeta!.icon"
      :categories="contextualPrimaryMeta!.categories"
      @see-all="handleLoadMore"
    >
      <LocationCard
        v-for="location in contextualPrimaryLocations"
        :key="location.uuid"
        :location
      />
    </Carousel>

    <Carousel
      v-if="showSecondaryCarousel"
      :title="$t(contextualSecondaryMeta!.title)"
      :icon="contextualSecondaryMeta!.icon"
      :categories="contextualSecondaryMeta!.categories"
      @see-all="handleLoadMore"
    >
      <LocationCard
        v-for="location in contextualSecondaryLocations"
        :key="location.uuid"
        :location
      />
    </Carousel>
  </div>
</template>

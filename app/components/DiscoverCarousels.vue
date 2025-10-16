<script setup lang="ts">
const { filteredRecentlyViewed } = useRecentlyViewed()
const {
  contextualPrimaryLocations,
  contextualPrimaryMeta,
  contextualSecondaryLocations,
  contextualSecondaryMeta,
} = useContextualCarousels()

const { setCategories, openNow, nearMe } = useSearch()

function handleLoadMore(categories: string[]) {
  setCategories(categories)
  openNow.value = true
  nearMe.value = true
}
</script>

<template>
  <div children:f-mt-sm>
    <Carousel
      v-if="filteredRecentlyViewed && filteredRecentlyViewed.length > 0"
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
      v-if="
        contextualPrimaryLocations
          && contextualPrimaryLocations.length > 0
          && contextualPrimaryMeta
      "
      :title="$t(contextualPrimaryMeta.title)"
      :icon="contextualPrimaryMeta.icon"
      :categories="contextualPrimaryMeta.categories"
      @see-all="handleLoadMore"
    >
      <LocationCard
        v-for="location in contextualPrimaryLocations"
        :key="location.uuid"
        :location
      />
    </Carousel>

    <Carousel
      v-if="
        contextualSecondaryLocations
          && contextualSecondaryLocations.length > 0
          && contextualSecondaryMeta
      "
      :title="$t(contextualSecondaryMeta.title)"
      :icon="contextualSecondaryMeta.icon"
      :categories="contextualSecondaryMeta.categories"
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

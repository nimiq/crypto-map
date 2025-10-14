<script setup lang="ts">
const { filteredRecentlyViewed } = useRecentlyViewed()
const { contextualPrimaryLocations, contextualPrimaryMeta, contextualSecondaryLocations, contextualSecondaryMeta } = useContextualCarousels()
</script>

<template>
  <div f-mt-md children:f-mt-sm>
    <Carousel v-if="filteredRecentlyViewed && filteredRecentlyViewed.length > 0" :title="$t('carousels.recentlyViewed')" icon="i-tabler:history">
      <LocationCard v-for="location in filteredRecentlyViewed" :key="location.uuid" :location />
    </Carousel>

    <Carousel v-if="contextualPrimaryLocations && contextualPrimaryLocations.length > 0 && contextualPrimaryMeta" :title="$t(contextualPrimaryMeta.title)" :icon="contextualPrimaryMeta.icon">
      <LocationCard v-for="location in contextualPrimaryLocations" :key="location.uuid" :location />
    </Carousel>

    <Carousel v-if="contextualSecondaryLocations && contextualSecondaryLocations.length > 0 && contextualSecondaryMeta" :title="$t(contextualSecondaryMeta.title)" :icon="contextualSecondaryMeta.icon">
      <LocationCard v-for="location in contextualSecondaryLocations" :key="location.uuid" :location />
    </Carousel>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { categories, openNow, nearMe, searchResults: locations, status, hasMore, loadMore, hasSearchParams, removeCategory } = useSearch()
const { data: categoriesData } = useFetch('/api/categories')

const showEmptyState = computed(() => !locations.value || locations.value.length === 0)
</script>

<template>
  <div>
    <DiscoverCarousels v-if="!hasSearchParams" />

    <template v-else>
      <QuickFilters v-model:open-now="openNow" v-model:near-me="nearMe" f-mt-2xs f-mb-md :selected-categories="categories" :categories="categoriesData" @remove-category="removeCategory" />
      <div v-if="status === 'pending'" grid="~ cols-3 gap-x-16 gap-y-20">
        <div v-for="n in 9" :key="n" rounded-8 bg-neutral-300 h-158 w-full animate-pulse />
      </div>

      <div v-else-if="showEmptyState" flex="~ col items-center justify-center" text-center>
        <div outline="neutral-400 ~ 3" stack rounded-4 size-96 f-mb-sm>
          <Icon name="i-nimiq:duotone-cactus" text-64 text-neutral-500 />
        </div>
        <h2 text="f-md neutral-800" font-semibold m-0>
          {{ t("locations.noResults.title") }}
        </h2>
        <p text="f-sm neutral-600" m-0 f-mt-xs>
          {{ t("locations.noResults.description") }}
        </p>
        <NuxtLink to="/" f-mt-xs nq-pill-tertiary outline="neutral-300 1.5">
          <Icon name="i-tabler:refresh" text-16 />
          <span>{{ t("locations.noResults.resetFilters") }}</span>
        </NuxtLink>
      </div>

      <LocationGrid v-else :locations="locations || []" :has-more @load-more="loadMore" />
    </template>
  </div>
</template>

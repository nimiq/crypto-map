<script setup lang="ts">
const { t } = useI18n()

const query = useRouteQuery('query', '')
const category = useRouteQuery<string | undefined>('category', undefined)

const hasSearchParams = computed(() => !!query.value || !!category.value)

const categories = computed(() => category.value ? [category.value] : undefined)

const { searchResults: locations, status, hasMore, loadMore, refreshSearch } = useLocationSearch({
  query,
  categories,
  immediate: toValue(hasSearchParams),
  shouldWatch: true,
  enableInfiniteScroll: true,
})

watch([query, category], () => {
  if (query.value || category.value)
    refreshSearch()
}, { immediate: true })
</script>

<template>
  <div>
    <QuickFilters f-mt-2xs f-mb-md />

    <DiscoverCarousels v-if="!hasSearchParams" />

    <template v-else>
      <div v-if="status === 'pending'" grid="~ cols-3 gap-x-16 gap-y-20">
        <div v-for="n in 9" :key="n" rounded-8 bg-neutral-300 h-158 w-full animate-pulse />
      </div>

      <div v-else-if="!locations || locations.length === 0" flex="~ col items-center justify-center" text-center>
        <div outline="neutral-400 ~ 3" size-96 stack f-mb-sm rounded-4>
          <Icon name="i-nimiq:duotone-cactus" text-64 text-neutral-500 />
        </div>
        <h2 text="f-md neutral-800" font-semibold m-0>
          {{ t('locations.noResults.title') }}
        </h2>
        <p text="f-sm neutral-600" m-0 f-mt-xs>
          {{ t('locations.noResults.description') }}
        </p>
        <NuxtLink to="/" f-mt-xs nq-pill-tertiary outline="neutral-300 1.5">
          <Icon name="i-tabler:refresh" text-16 />
          <span>{{ t('locations.noResults.resetFilters') }}</span>
        </NuxtLink>
      </div>

      <LocationGrid v-else :locations="locations || []" :has-more="hasMore" @load-more="loadMore" />
    </template>
  </div>
</template>

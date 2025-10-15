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
    <DiscoverCarousels v-if="!hasSearchParams" />

    <template v-else>
      <header f-mt-sm f-mb-xs nq-label>
        <h1 text="f-xs neutral-900" font-bold m-0>
          {{ query || (category ? t(`categories.${category}`) : '') }}
        </h1>
        <p v-if="category && query" text="f-xs neutral-700" m-0 f-mt-xs>
          {{ t(`categories.${category}`) }}
        </p>
      </header>

      <div v-if="status === 'pending'" grid="~ cols-3 gap-x-16 gap-y-20">
        <div v-for="n in 9" :key="n" rounded-8 bg-neutral-200 h-158 w-full animate-pulse />
      </div>

      <div v-else-if="!locations || locations.length === 0" flex="~ col items-center justify-center" text-center>
        <Icon name="i-tabler:search-off" text-64 text-neutral-400 f-mb-sm />
        <h2 text="f-md neutral-800" font-semibold m-0>
          {{ t('locations.noResults.title') }}
        </h2>
        <p text="f-sm neutral-600" m-0 f-mt-xs>
          {{ t('locations.noResults.description') }}
        </p>
        <NuxtLink to="/" flex="~ items-center gap-8" px-16 py-8 rounded-full bg-neutral-100 no-underline transition-colors f-mt-md hover:bg-neutral-200 un-text="neutral-800 f-sm">
          <Icon name="i-tabler:refresh" text-16 />
          <span>{{ t('locations.noResults.resetFilters') }}</span>
        </NuxtLink>
      </div>

      <LocationGrid v-else :locations="locations || []" :has-more="hasMore" @load-more="loadMore" />
    </template>
  </div>
</template>

<script setup lang="ts">
const { searchQuery } = useLocationSearch()
const { data: stats } = useFetch('/api/locations/stats')

const hasSearchQuery = computed(() => searchQuery.value && searchQuery.value.length > 0)

// Round down to nearest 10 (< 100) or 100 (≥ 100) for approximate count display
const roundedCount = computed(() => {
  if (!stats.value?.totalLocations) return 0
  const count = stats.value.totalLocations
  return count >= 100 ? Math.floor(count / 100) * 100 : Math.floor(count / 10) * 10
})
</script>

<template>
  <div text-center f-py-2xl f-mt-md>
    <div v-if="!hasSearchQuery" flex="~ items-center justify-center" mx-auto rounded-full bg-neutral-100 size-64
      f-mb-md>
      <Icon name="i-nimiq:icons-lg-bitcoin" text-neutral-400 size-32 />
    </div>
    <div v-else flex="~ items-center justify-center" mx-auto rounded-full bg-neutral-100 size-64 f-mb-md>
      <Icon name="i-nimiq:magnifying-glass" text-neutral-400 size-32 />
    </div>
    <p text="neutral-800 f-lg" font-semibold m-0>
      {{ hasSearchQuery ? $t('empty.noResults') : $t('empty.title') }}
    </p>
    <p v-if="!hasSearchQuery && stats" text="neutral-600 f-sm" m-0 f-mt-xs flex="~ items-center gap-4 justify-center">
      <Icon name="i-nimiq-flags:ch-hexagon" h-16 inline-block />
      <span>{{ $t('empty.subtitle', { count: `${roundedCount}+` }) }}</span>
    </p>
    <p v-else text="neutral-600 f-sm" m-0 f-mt-xs>
      {{ $t('empty.noResultsSubtitle') }}
    </p>
  </div>
</template>

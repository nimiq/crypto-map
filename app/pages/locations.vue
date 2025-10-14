<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const query = computed(() => route.query.query as string || '')
const category = computed(() => route.query.category as string | undefined)

// Redirect if no parameters
if (!query.value && !category.value) {
  navigateTo('/')
}

const categories = computed(() => category.value ? [category.value as string] : undefined)

const { searchResults: locations, status } = useLocationSearch({
  query,
  categories,
  immediate: true,
  watch: true,
})
</script>

<template>
  <div>
    <header f-mb-md>
      <h1 text="f-lg neutral-900" font-bold m-0>
        {{ query }}
      </h1>
      <p v-if="category" text="f-sm neutral-700" m-0 f-mt-xs>
        {{ t(`categories.${category}`) }}
      </p>
    </header>

    <div v-if="status === 'pending'" grid="~ cols-1 md:cols-2 lg:cols-3 gap-16">
      <div v-for="n in 9" :key="n" rounded-8 bg-neutral-200 h-200 w-full animate-pulse />
    </div>

    <div v-else-if="!locations || locations.length === 0" flex="~ col items-center justify-center" text-center f-py-xl>
      <Icon name="i-tabler:search-off" text-64 text-neutral-400 f-mb-md />
      <h2 text="f-md neutral-800" font-semibold m-0>
        {{ t('locations.noResults.title') }}
      </h2>
      <p text="f-sm neutral-600" m-0 f-mt-xs>
        {{ t('locations.noResults.description') }}
      </p>
    </div>

    <div v-else grid="~ cols-1 md:cols-2 lg:cols-3 gap-16">
      <LocationCard v-for="location in locations" :key="location.uuid" :location />
    </div>
  </div>
</template>

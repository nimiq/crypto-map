<script setup lang="ts">
const { t } = useI18n()
const query = useRouteQuery<string | undefined>('query', undefined)
const category = useRouteQuery<string | undefined>('category', undefined)
const { openNow, nearMe } = useSearchFilters()

const hasSearchParams = computed(() => !!query.value || !!category.value)

const selectedFilters = computed<string[]>({
  get: () => {
    const filters: string[] = []
    if (openNow.value) filters.push('openNow')
    if (nearMe.value) filters.push('nearMe')
    return filters
  },
  set: (value: string[]) => {
    openNow.value = value.includes('openNow')
    nearMe.value = value.includes('nearMe')
  },
})

function formatCategoryLabel(cat: string) {
  const translationKey = `categories.${cat}`
  const translated = t(translationKey)
  if (translated && translated !== translationKey)
    return translated

  return cat
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const categoryLabel = computed(() => category.value ? formatCategoryLabel(category.value) : null)

function clearCategory() {
  category.value = undefined
}
</script>

<template>
  <div>
    <ToggleGroupRoot v-model="selectedFilters" type="multiple" nq-raw flex="~ gap-8">
      <ToggleGroupItem value="openNow" bg="neutral-0 reka-on:blue" rounded-full outline="~ 1.5 offset--1.5 neutral/10 reka-on:white/10" f-px-2xs flex="~ items-center gap-4" py-3>
        <Icon name="i-tabler:clock" text="neutral-700 reka-on:white" />
        <span text="f-xs neutral-800 reka-on:white" font-medium>{{ t('filters.openNow') }}</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="nearMe" bg="neutral-0 reka-on:blue" rounded-full outline="~ 1.5 offset--1.5 neutral/10" f-px-2xs flex="~ items-center gap-4" py-3>
        <Icon name="i-tabler:walk" text="neutral-700 reka-on:white" />
        <span text="f-xs neutral-800 reka-on:white" font-medium>{{ t('filters.nearMe') }}</span>
      </ToggleGroupItem>
    </ToggleGroupRoot>

    <button v-if="category" @click="clearCategory">
      <span>{{ categoryLabel }}</span>
      <Icon name="i-tabler:x" />
    </button>
  </div>
</template>

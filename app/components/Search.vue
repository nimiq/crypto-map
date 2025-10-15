<script setup lang="ts">
import type { ComboboxInput } from 'reka-ui'

type SearchItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
    | { kind: 'category', category: string, label: string }

const searchQuery = useState('searchQuery', () => '')
const { autocompleteResults, skipNextAutocompleteFetch } = useSearchAutocomplete()
const { t } = useI18n()

const routeQuery = useRouteQuery<string | undefined>('query', undefined)
const routeCategory = useRouteQuery<string | undefined>('category', undefined)

const isComboboxOpen = ref(false)

const shouldShowNearYou = computed(() => {
  const trimmed = searchQuery.value.trim()
  return trimmed.length >= 4 || trimmed.includes(' ')
})

const searchDisplayValue = computed(() => {
  const marked = `<mark>${searchQuery.value}</mark>`
  return shouldShowNearYou.value ? `${marked} near you` : marked
})

const input = useTemplateRef<InstanceType<typeof ComboboxInput>>('search-input')
const $input = computed(() => input.value?.$el as HTMLInputElement | undefined)

const [DefineComboboxItemTemplate, Item] = createReusableTemplate<{
  item: SearchItem
  displayValue?: string
  icon: string
  color?: 'orange' | 'red' | 'purple' | 'green' | 'neutral'
  subline?: string
}>()

function getItemValue(item: SearchItem) {
  switch (item.kind) {
    case 'location': return item.name
    case 'query': return item.query
    case 'category': return item.label
  }
}

function getDisplayValue(item: SearchItem, displayValue?: string) {
  if (displayValue)
    return displayValue

  switch (item.kind) {
    case 'location': return item.name
    case 'query': return item.query
    case 'category': return item.label
  }
}

function handleClose() {
  searchQuery.value = ''
  $input.value?.blur()
}

function formatCategoryLabel(category: string) {
  const translationKey = `categories.${category}`
  const translated = t(translationKey)
  if (translated && translated !== translationKey)
    return translated

  return category
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const quickCategories = computed(() => ([
  { category: 'restaurant', label: formatCategoryLabel('restaurant'), icon: 'i-tabler:tools-kitchen-2', color: 'orange' as const },
  { category: 'cafe', label: formatCategoryLabel('cafe'), icon: 'i-tabler:coffee', color: 'red' as const },
  { category: 'bar', label: formatCategoryLabel('bar'), icon: 'i-tabler:beer', color: 'green' as const },
  { category: 'pharmacy', label: formatCategoryLabel('pharmacy'), icon: 'i-tabler:pill', color: 'purple' as const },
]))

const showQuickCategories = computed(() => {
  const queryValue = routeQuery.value ?? ''
  const hasQuery = queryValue.trim().length > 0
  return searchQuery.value.trim().length === 0 && !hasQuery && !routeCategory.value
})

watch(routeCategory, (newCategory, prevCategory) => {
  if (newCategory) {
    const label = formatCategoryLabel(newCategory)
    if (searchQuery.value !== label) {
      skipNextAutocompleteFetch()
      searchQuery.value = label
    }
    autocompleteResults.value = []
  }
  else if (!routeQuery.value && prevCategory) {
    skipNextAutocompleteFetch()
    searchQuery.value = ''
    autocompleteResults.value = []
  }
}, { immediate: true })

watch(routeQuery, (newQuery, prevQuery) => {
  if (newQuery) {
    if (searchQuery.value !== newQuery) {
      skipNextAutocompleteFetch()
      searchQuery.value = newQuery
    }
    autocompleteResults.value = []
  }
  else if (!routeCategory.value && prevQuery) {
    skipNextAutocompleteFetch()
    searchQuery.value = ''
    autocompleteResults.value = []
  }
}, { immediate: true })

async function handleItemClick(item: SearchItem) {
  switch (item.kind) {
    case 'location':
      await navigateTo(`/location/${item.uuid}`)
      break
    case 'query':
      routeQuery.value = item.query
      routeCategory.value = undefined
      searchQuery.value = ''
      isComboboxOpen.value = false
      break
    case 'category':
      skipNextAutocompleteFetch()
      routeCategory.value = item.category
      routeQuery.value = undefined
      isComboboxOpen.value = false
      break
  }
}
</script>

<template>
  <DefineComboboxItemTemplate v-slot="{ item, displayValue, icon, color = 'neutral', subline }">
    <ComboboxItem :value="getItemValue(item)" as-child>
      <button type="button" flex="~ items-center gap-16" px-16 py-12 text-left border-0 bg-transparent w-full cursor-pointer @click="handleItemClick(item)">
        <div
          :class="{
            'outline-orange-500 bg-orange-400 text-orange-1100': color === 'orange',
            'outline-gold-500 bg-gold-400 text-gold-1100': color === 'red',
            'outline-purple-500 bg-purple-400 text-purple-1100': color === 'purple',
            'outline-green-500 bg-green-400 text-green-1100': color === 'green',
            'outline-neutral-400 bg-neutral-300 text-neutral-900': color === 'neutral',
          }" stack rounded-full size-28 outline="1 offset--1"
        >
          <Icon :name="icon" text-18 />
        </div>
        <div v-if="subline" flex="~ col gap-2">
          <span text-neutral-800 v-html="getDisplayValue(item, displayValue)" />
          <span text-neutral-600 text-f-xs>{{ subline }}</span>
        </div>
        <span v-else text-neutral-800 v-html="getDisplayValue(item, displayValue)" />
      </button>
    </ComboboxItem>
  </DefineComboboxItemTemplate>

  <ComboboxRoot v-model:open="isComboboxOpen" open-on-click open-on-focus>
    <ComboboxAnchor relative>
      <ComboboxInput ref="search-input" v-model="searchQuery" bg="neutral-0 focus:neutral-100" outline="0.5 neutral-400" name="search" text-neutral px-47 py-6 rounded-full w-full transition-colors shadow-sm placeholder="Search here" />
      <ComboboxTrigger left-16 top-0 absolute translate-y="9.5" @click="handleClose">
        <Icon v-if="!isComboboxOpen" name="i-nimiq:logos-crypto-map" size-18 />
        <Icon v-else name="i-tabler:arrow-left" op-70 size-18 />
      </ComboboxTrigger>
      <ComboboxCancel v-if="searchQuery.length > 0" as-child translate-y-0 right-0 top-0 absolute z-1>
        <button flex="~ items-center justify-center" size-36>
          <Icon name="i-tabler:x" text-16 op-65 translate-y-1 />
        </button>
      </ComboboxCancel>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="8" nq-raw align="start" flex="~ col" bg-neutral-0 size-full z-50>
        <ComboboxViewport flex="~ col" h-full of-auto>
          <div flex="~ col" h-full f="$p-16/24" px="$f-p">
            <template v-if="showQuickCategories">
              <template v-for="(item, index) in quickCategories" :key="item.category">
                <Item :item="{ kind: 'category', category: item.category, label: item.label }" :icon="item.icon" :color="item.color" />
                <ComboboxSeparator v-if="index < quickCategories.length - 1" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              </template>
            </template>
            <template v-else>
              <template v-if="!routeCategory">
                <Item :key="`query-${searchQuery}`" color="red" :item="{ kind: 'query', query: searchQuery }" :display-value="searchDisplayValue" icon="i-tabler:search" />
                <ComboboxSeparator v-if="autocompleteResults && autocompleteResults.length > 0" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              </template>
              <template v-for="({ uuid, name, address, icon }, i) in autocompleteResults" :key="uuid">
                <Item :item="{ kind: 'location', uuid, name }" :icon="icon || 'i-tabler:map-pin'" :subline="address" />
                <ComboboxSeparator v-if="i < autocompleteResults!.length - 1" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              </template>
            </template>
          </div>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style>
[data-reka-popper-content-wrapper] {
  height: calc(100vh - var(--anchor-top, 80px));
  width: 100vw !important;
  left: 0 !important;
}
mark {
  --uno: 'bg-transparent text-neutral';
}
</style>

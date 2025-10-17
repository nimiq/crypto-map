<script setup lang="ts">
import type { ComboboxInput } from 'reka-ui'

type SearchItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
    | { kind: 'category', category: string, label: string }

interface Props {
  autocompleteResults?: SearchLocationResponse[]
}
interface Emits {
  (e: 'navigate', uuid: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const query = defineModel<string | undefined>('query')
const category = defineModel<string | undefined>('category')

// Use the composable's localSearchInput for autocomplete triggering
const { localSearchInput, clearSearch } = useSearch()

// Computed getter/setter for combobox binding
const searchQuery = computed({
  get: () => localSearchInput.value,
  set: (value: string) => {
    localSearchInput.value = value
  },
})

const isComboboxOpen = ref(false)
const searchDisplayValue = computed(() => `<mark>${searchQuery.value}</mark> near you`)
const input
  = useTemplateRef<InstanceType<typeof ComboboxInput>>('search-input')
const $input = computed(() => input.value?.$el as HTMLInputElement | undefined)

const [DefineComboboxItemTemplate, Item] = createReusableTemplate<{
  item: SearchItem
  displayValue?: string
  icon: string
  color?: 'orange' | 'gold' | 'red' | 'purple' | 'green' | 'neutral'
  subline?: string
}>()

function getItemValue(item: SearchItem) {
  switch (item.kind) {
    case 'location':
      return item.name
    case 'query':
      return item.query
    case 'category':
      return item.label
  }
}

function getDisplayValue(item: SearchItem, displayValue?: string) {
  if (displayValue)
    return displayValue
  switch (item.kind) {
    case 'location':
      return item.name
    case 'query':
      return item.query
    case 'category':
      return item.label
  }
}

function collapseCombobox() {
  isComboboxOpen.value = false
  if (import.meta.client) {
    nextTick(() => {
      $input.value?.blur()
    })
  }
}

function handleClose() {
  localSearchInput.value = ''
  query.value = undefined
  category.value = undefined
  collapseCombobox()
}

function handleClearSearch() {
  clearSearch()
  query.value = undefined
  category.value = undefined
}

const { getQuickCategories } = useSearchHistory()
const quickCategories = computed(() => getQuickCategories())

const showQuickCategories = computed(() => {
  const queryValue = query.value ?? ''
  const hasQuery = queryValue.trim().length > 0
  return searchQuery.value.trim().length === 0 && !hasQuery && !category.value
})

async function handleItemClick(item: SearchItem) {
  switch (item.kind) {
    case 'location':
      emit('navigate', item.uuid)
      break
    case 'query':
      query.value = item.query
      category.value = undefined
      collapseCombobox()
      break
    case 'category':
      category.value = item.category
      query.value = undefined
      collapseCombobox()
      break
  }
}
</script>

<template>
  <DefineComboboxItemTemplate v-slot="{ item, displayValue, icon, color = 'neutral', subline }">
    <ComboboxItem :value="getItemValue(item)" as-child>
      <button type="button" flex="~ items-center gap-16" px-16 py-12 text-left border-0 bg-transparent w-full cursor-pointer @click="handleItemClick(item)">
        <div :class="{ 'outline-orange-500 text-orange-1100': color === 'orange', 'outline-gold-500 text-gold-1100': color === 'gold', 'outline-red-500 text-red-1100': color === 'red', 'outline-purple-500 text-purple-1100': color === 'purple', 'outline-green-500 text-green-1100': color === 'green', 'outline-neutral-400 text-neutral-900': color === 'neutral' }" stack rounded-full bg="gold-400 green-400 neutral-300 orange-400 purple-400 red-400" size-28 outline="1 offset--1">
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

  <ComboboxRoot v-model:open="isComboboxOpen" open-on-click open-on-focus :filter-function="() => true">
    <ComboboxAnchor relative>
      <ComboboxInput ref="search-input" v-model="searchQuery" bg="neutral-0" outline="0.5 neutral-400" name="search" text-neutral px-47 py-6 rounded-full w-full transition-colors shadow-sm placeholder="Search here" />
      <button p-0 border-0 bg-transparent cursor-pointer translate-y-9.5 left-16 top-0 absolute @click="handleClose">
        <Icon v-if="!isComboboxOpen" name="i-nimiq:logos-crypto-map" size-18 />
        <Icon v-else name="i-tabler:arrow-left" op-70 size-18 />
      </button>
      <ComboboxCancel v-if="searchQuery.length > 0" as-child translate-y-0 right-0 top-0 absolute z-1>
        <button flex="~ items-center justify-center" size-36 @click="handleClearSearch">
          <Icon name="i-tabler:x" text-16 op-65 translate-y-1 />
        </button>
      </ComboboxCancel>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="8" nq-raw align="start" flex="~ col" bg-neutral-0 size-full z-50>
        <ComboboxViewport flex="~ col" h-full of-auto>
          <div flex="~ col" h-full f="$p-16/24" px="$f-p">
            <template v-if="showQuickCategories">
              <template v-for="(item, index) in quickCategories" :key="item.category || item.query">
                <Item :item="item.query ? { kind: 'query', query: item.query } : { kind: 'category', category: item.category!, label: item.label }" :icon="item.icon" :color="item.color" />
                <ComboboxSeparator v-if="index < quickCategories.length - 1" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              </template>
            </template>
            <template v-else>
              <Item v-if="searchQuery.trim().length > 0 && (!autocompleteResults || autocompleteResults.length === 0)" key="search-query" color="red" :item="{ kind: 'query', query: searchQuery }" :display-value="searchDisplayValue" icon="i-tabler:search" />
              <ComboboxSeparator v-if="searchQuery.trim().length > 0 && autocompleteResults && autocompleteResults.length > 0" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
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

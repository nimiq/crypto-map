<script setup lang="ts">
import type { ComboboxInput } from 'reka-ui'

type SearchItem
  = | { kind: 'location', uuid: string, name: string, latitude: number, longitude: number }
    | { kind: 'query', query: string }
    | { kind: 'category', category: string, label: string }
    | { kind: 'geo', name: string, displayName: string, latitude: number, longitude: number, geoType: GeoType }

interface Props {
  autocompleteLocations?: SearchLocationResponse[]
  autocompleteGeo?: GeoResult[] // Strong matches (before locations)
  autocompleteGeoWeak?: GeoResult[] // Weak matches (after locations)
}
interface Emits {
  (e: 'navigate', uuid: string | undefined, latitude: number, longitude: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const query = defineModel<string | undefined>('query')
const category = defineModel<string | undefined>('category')

// Use the composable's localSearchInput for autocomplete triggering
const { localSearchInput, clearSearch, categorySuggestion, formatCategoryLabel } = useSearch()

// Computed getter/setter for combobox binding
const searchQuery = computed({
  get: () => localSearchInput.value,
  set: (value: string) => {
    localSearchInput.value = value
  },
})

const isComboboxOpen = ref(false)
const searchDisplayValue = computed(() => {
  const label = categorySuggestion.value
    ? formatCategoryLabel(categorySuggestion.value.categoryId)
    : searchQuery.value
  return `<mark>${label}</mark> near you`
})
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
    case 'geo':
      return item.name
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
    case 'geo':
      return item.displayName
  }
}

function getGeoIcon(geoType: GeoType): string {
  switch (geoType) {
    case 'city':
      return 'i-tabler:buildings'
    case 'address':
      return 'i-tabler:map-pin'
    case 'region':
      return 'i-tabler:world'
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
      emit('navigate', item.uuid, item.latitude, item.longitude)
      break
    case 'query':
      query.value = item.query
      category.value = undefined
      collapseCombobox()
      await navigateTo('/')
      break
    case 'category':
      category.value = item.category
      query.value = undefined
      collapseCombobox()
      await navigateTo('/')
      break
    case 'geo':
      emit('navigate', undefined, item.latitude, item.longitude)
      collapseCombobox()
      break
  }
}
</script>

<template>
  <ComboboxRoot v-model:open="isComboboxOpen" open-on-click open-on-focus ignore-filter>
    <DefineComboboxItemTemplate
      v-slot="{ item, displayValue, icon, color = 'neutral', subline }"
    >
      <ComboboxItem :value="getItemValue(item)" as-child>
        <button type="button" flex="~ items-center gap-16" px-16 py-12 text-left border-0 bg-transparent w-full cursor-pointer @click="handleItemClick(item)">
          <div
            :class="{
              'bg-orange-400 outline-orange-500 text-orange-1100': color === 'orange',
              'bg-gold-400 outline-gold-500 text-gold-1100': color === 'gold',
              'bg-red-400 outline-red-500 text-red-1100': color === 'red',
              'bg-purple-400 outline-purple-500 text-purple-1100': color === 'purple',
              'bg-green-400 outline-green-500 text-green-1100': color === 'green',
              'bg-neutral-300 outline-neutral-400 text-neutral-900': color === 'neutral',
            }"
            stack rounded-full size-28 outline="1 offset--1"
          >
            <Icon :name="icon" text-18 />
          </div>
          <div v-if="subline" flex="~ col gap-2" min-w-0>
            <span text-neutral-800 truncate v-html="getDisplayValue(item, displayValue)" />
            <span text="f-xs neutral-600">{{ subline }}</span>
          </div>
          <span v-else text-neutral-800 truncate v-html="getDisplayValue(item, displayValue)" />
        </button>
      </ComboboxItem>
    </DefineComboboxItemTemplate>

    <ComboboxAnchor as="div" inset-x-0 top-0 absolute z-60>
      <div mt-12 px-12 w-screen relative>
        <ComboboxInput ref="search-input" v-model="searchQuery" outline="0.5 neutral-400" name="search" placeholder="Search here" v-bind="$attrs" text-neutral px-47 pb-12 pt-10 rounded-full bg-neutral-0 w-full shadow transition-colors />
        <button p-0 border-0 bg-transparent cursor-pointer translate-y-13.5 left-28 top-0 absolute @click="handleClose">
          <Icon v-if="!isComboboxOpen" name="i-tabler:search" op-70 size-18 />
          <Icon v-else name="i-tabler:arrow-left" op-70 size-18 />
        </button>
        <ComboboxCancel v-if="searchQuery.length > 0 || query || category" as-child translate-y-0 right-16 top-0 absolute>
          <button flex="~ items-center justify-center" size-36 @click="handleClearSearch">
            <Icon name="i-tabler:x" text-16 op-65 translate-y-1 />
          </button>
        </ComboboxCancel>
      </div>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="inline" flex="~ col" bg-neutral-100 inset-0 fixed z-50 pt="56 md:60">
        <ComboboxViewport flex="~ col" h-full of-auto>
          <div flex="~ col" h-full f-px-md f-pt-sm>
            <template v-if="showQuickCategories">
              <template v-for="(item, index) in quickCategories" :key="item.category || item.query">
                <Item
                  :item="item.query
                    ? { kind: 'query', query: item.query }
                    : { kind: 'category', category: item.category!, label: item.label }
                  "
                  :icon="item.icon" :color="item.color"
                />
                <ComboboxSeparator v-if="index < quickCategories.length - 1" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              </template>
            </template>
            <template v-else>
              <!-- 1. Category suggestion or search query -->
              <Item
                v-if="categorySuggestion && searchQuery.trim().length > 0"
                key="category-suggestion"
                color="red"
                :item="{ kind: 'category', category: categorySuggestion.categoryId, label: formatCategoryLabel(categorySuggestion.categoryId) }"
                :display-value="searchDisplayValue"
                icon="i-tabler:search"
              />
              <Item
                v-else-if="searchQuery.trim().length > 0"
                key="search-query"
                color="red"
                :item="{ kind: 'query', query: searchQuery }"
                :display-value="searchQuery"
                icon="i-tabler:search"
              />

              <!-- 2. Strong geo matches (cities/regions matching query) -->
              <ComboboxSeparator
                v-if="searchQuery.trim().length > 0 && autocompleteGeo && autocompleteGeo.length > 0"
                border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60
              />
              <template v-for="(geo, i) in autocompleteGeo" :key="`geo-${geo.latitude}-${geo.longitude}`">
                <Item :item="geo" :icon="getGeoIcon(geo.geoType)" />
                <ComboboxSeparator
                  v-if="i < autocompleteGeo!.length - 1 || (autocompleteLocations && autocompleteLocations.length > 0)"
                  border="t-1 neutral-400"
                  w="[calc(100%-60px+var(--f-p))]"
                  ml-60
                />
              </template>

              <!-- 3. Location results from DB -->
              <ComboboxSeparator
                v-if="searchQuery.trim().length > 0 && (!autocompleteGeo || autocompleteGeo.length === 0) && autocompleteLocations && autocompleteLocations.length > 0"
                border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60
              />
              <template v-for="({ uuid, name, city, country, icon, latitude, longitude }, i) in autocompleteLocations" :key="uuid">
                <Item :item="{ kind: 'location', uuid, name, latitude, longitude }" :icon="icon || 'i-tabler:map-pin'" :subline="[city, country].filter(Boolean).join(', ')" />
                <ComboboxSeparator
                  v-if="i < autocompleteLocations!.length - 1 || (autocompleteGeoWeak && autocompleteGeoWeak.length > 0)"
                  border="t-1 neutral-400"
                  w="[calc(100%-60px+var(--f-p))]"
                  ml-60
                />
              </template>

              <!-- 4. Weak geo matches (less relevant geographic results) -->
              <template v-for="(geo, i) in autocompleteGeoWeak" :key="`geo-weak-${geo.latitude}-${geo.longitude}`">
                <Item :item="geo" :icon="getGeoIcon(geo.geoType)" />
                <ComboboxSeparator
                  v-if="i < autocompleteGeoWeak!.length - 1"
                  border="t-1 neutral-400"
                  w="[calc(100%-60px+var(--f-p))]"
                  ml-60
                />
              </template>
            </template>
          </div>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style>
mark {
  --uno: 'bg-transparent text-neutral';
}
</style>

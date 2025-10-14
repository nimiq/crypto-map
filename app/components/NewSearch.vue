<script setup lang="ts">
import type { ComboboxInput } from 'reka-ui'

type SelectedItem
  = | { kind: 'location', uuid: string, name: string }
  | { kind: 'query', query: string }
const selectedItem = defineModel<SelectedItem>()

const { searchQuery, autocompleteResults, searchResults, searchPending, refreshSearch } = useLocationSearch()
const { openNow } = useSearchFilters()

const isComboboxOpen = ref(false)

const { data: locationResult, pending: locationPending, refresh: refreshLocation } = useFetch(
  () => `/api/locations/${selectedItem.value?.kind === 'location' ? selectedItem.value.uuid : ''}`,
  {
    transform: (loc) => {
      if (!loc || !('openingHours' in loc))
        return loc
      return {
        ...loc,
        hoursStatus: getOpeningHoursStatus(loc),
      }
    },
    immediate: false,
  },
)

const locations = computed(() => {
  if (selectedItem.value?.kind === 'location') {
    return locationResult.value && 'gmapsPlaceId' in locationResult.value ? [locationResult.value] : []
  }
  return searchResults.value || []
})

const input = useTemplateRef<InstanceType<typeof ComboboxInput>>('search-input')
const $input = computed(() => input.value?.$el as HTMLInputElement | undefined)
const { focused } = useFocus($input)

const [DefineComboboxItemTemplate, Item] = createReusableTemplate<{
  value: SelectedItem
  displayValue?: string
  icon: string
  color?: 'orange' | 'red' | 'purple' | 'green' | 'neutral'
  subline?: string
}>()

function handleClose() {
  searchQuery.value = ''
  $input.value?.blur()
}
</script>

<template>
  <DefineComboboxItemTemplate v-slot="{ value, displayValue, icon, color = 'neutral', subline }">
    <ComboboxItem :value="value" flex="~ items-center gap-16" px-16 py-12 class="[&_mark]:text-neutral">
      <div :class="{
        'outline-orange-500 bg-orange-400 text-orange-1100': color === 'orange',
        'outline-gold-500 bg-gold-400 text-gold-1100': color === 'red',
        'outline-purple-500 bg-purple-400 text-purple-1100': color === 'purple',
        'outline-green-500 bg-green-400 text-green-1100': color === 'green',
        'outline-neutral-400 bg-neutral-300 text-neutral-900': color === 'neutral',
      }" rounded-full size-28 stack outline="1 offset--1">
        <Icon :name="icon" text-18 />
      </div>
      <div v-if="subline" flex="~ col gap-2" >
        <span text-neutral-800 v-html="value.kind === 'location' ? (displayValue || value.name) : (displayValue || value.query)" />
        <span text-neutral-600 text-f-xs>{{ subline }}</span>
      </div>
      <span v-html="value.kind === 'location' ? (displayValue || value.name) : (displayValue || value.query)" text-neutral-800 />
    </ComboboxItem>
  </DefineComboboxItemTemplate>

  <ComboboxRoot v-model:open="isComboboxOpen" open-on-click openOnFocus>
    <ComboboxAnchor relative>
      <ComboboxInput w-full bg="neutral-0 focus:neutral-100" transition-colors outline="0.5 neutral-400" shadow-sm
        name="search" v-model="searchQuery" py-6 rounded-full text-neutral px-47 placeholder="Search here"
        ref="search-input" />
      <ComboboxTrigger @click="handleClose" absolute left-16 top-0 translate-y="9.5">
        <Icon v-if="!isComboboxOpen" name="i-nimiq:logos-crypto-map" size-18 />
        <Icon v-else name="i-tabler:arrow-left" op-70 size-18 />
      </ComboboxTrigger>
      <ComboboxCancel as-child v-if="searchQuery.length > 0" z-1 absolute right-0 top-0 translate-y-0>
        <button flex="~ items-center justify-center" size-36>
          <Icon name="i-tabler:x" text-16 translate-y-1 op-65 />
        </button>
      </ComboboxCancel>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="8" align="start" bg-white z-50 flex="~ col" size-full>
        <ComboboxViewport flex="~ col" h-full of-auto>
          <!-- <ComboboxEmpty>
            Search for places to visit, eat, shop &amp; more.
          </ComboboxEmpty> -->

          <div flex="~ col" h-full f="$p-16/24" px="$f-p">
            <template v-if="!searchQuery">
              <Item :value="{ kind: 'query', query: 'Restaurant' }" icon="i-tabler:tools-kitchen-2" color="orange" />
              <ComboboxSeparator border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <Item :value="{ kind: 'query', query: 'Cafe' }" icon="i-tabler:coffee" color="red" />
              <ComboboxSeparator border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <Item :value="{ kind: 'query', query: 'Shopping' }" icon="i-tabler:shopping-bag" color="purple" />
              <ComboboxSeparator border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <Item :value="{ kind: 'query', query: 'Bar' }" icon="i-tabler:glass-cocktail" color="green" />
            </template>
            <template v-else>
              <Item :key="searchQuery" color="red" :value="{ kind: 'query', query: searchQuery, }" :display-value="`<mark>${searchQuery}</mark> near you`"
              icon="i-tabler:search" />
              <ComboboxSeparator v-if="autocompleteResults && autocompleteResults.length > 0" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <template  v-for="({uuid, name, address, icon}, i) in autocompleteResults" :key="uuid">
                <Item :value="{ kind: 'location', uuid, name}" :icon="icon || 'i-tabler:map-pin'" :subline="address" />
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
  background-color: transparent;
}
</style>

<script setup lang="ts">
import type { ComboboxInput } from 'reka-ui'
import type { RouteLocationRaw } from 'vue-router'

type SearchItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }

// Use shared search query state directly to ensure it's writable
const searchQuery = useState('searchQuery', () => '')
const { autocompleteResults } = useSearchAutocomplete()

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

function getItemLink(item: SearchItem): RouteLocationRaw | string {
  if (item.kind === 'query') {
    return { path: '/', query: { query: item.query } }
  }
  return `/${item.uuid}`
}

function handleClose() {
  searchQuery.value = ''
  $input.value?.blur()
}
</script>

<template>
  <DefineComboboxItemTemplate v-slot="{ item, displayValue, icon, color = 'neutral', subline }">
    <ComboboxItem :value="item.kind === 'location' ? item.uuid : item.query" as-child>
      <NuxtLink :to="getItemLink(item)" flex="~ items-center gap-16" px-16 py-12 no-underline class="[&_mark]:text-neutral">
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
          <span text-neutral-800 v-html="item.kind === 'location' ? (displayValue || item.name) : (displayValue || item.query)" />
          <span text-neutral-600 text-f-xs>{{ subline }}</span>
        </div>
        <span v-else text-neutral-800 v-html="item.kind === 'location' ? (displayValue || item.name) : (displayValue || item.query)" />
      </NuxtLink>
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
      <ComboboxContent position="popper" :side-offset="8" align="start" flex="~ col" bg-neutral-0 size-full z-50>
        <ComboboxViewport flex="~ col" h-full of-auto>
          <div flex="~ col" h-full f="$p-16/24" px="$f-p">
            <template v-if="!searchQuery">
              <Item :item="{ kind: 'query', query: 'Restaurant' }" icon="i-tabler:tools-kitchen-2" color="orange" />
              <ComboboxSeparator border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <Item :item="{ kind: 'query', query: 'Cafe' }" icon="i-tabler:coffee" color="red" />
              <ComboboxSeparator border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <Item :item="{ kind: 'query', query: 'Shopping' }" icon="i-tabler:shopping-bag" color="purple" />
              <ComboboxSeparator border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
              <Item :item="{ kind: 'query', query: 'Bar' }" icon="i-tabler:glass-cocktail" color="green" />
            </template>
            <template v-else>
              <Item :key="searchQuery" color="red" :item="{ kind: 'query', query: searchQuery }" :display-value="searchDisplayValue" icon="i-tabler:search" />
              <ComboboxSeparator v-if="autocompleteResults && autocompleteResults.length > 0" border="t-1 neutral-400" w="[calc(100%-60px+var(--f-p))]" ml-60 />
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
  background-color: transparent;
}
</style>

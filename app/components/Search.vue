<script setup lang="ts">
type SelectedItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
const selectedItem = defineModel<SelectedItem>()

const { openNow, walkable } = useSearchFilters()
const { searchQuery, autocompleteResults } = useLocationSearch()

const inputRef = useTemplateRef<{ $el: HTMLInputElement }>('searchInput')

watch(selectedItem, () => {
  inputRef.value?.$el?.blur()
})
</script>

<template>
  <form>
    <ComboboxRoot v-model="selectedItem" :display-value="selectedItem">
      <ComboboxAnchor>
        <ComboboxInput ref="searchInput" v-model="searchQuery" :placeholder="$t('search.placeholder')" nq-input-box name="query" />
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent position="popper" side="bottom" :side-offset="4" w="$reka-combobox-trigger-width" outline="~ 1.5 neutral-200" rounded-b-8 bg-white max-h-256 shadow z-50 of-auto>
          <ComboboxViewport>
            <ComboboxItem :key="searchQuery" :value="{ kind: 'query', query: searchQuery }" flex="~ items-center gap-8" text="f-sm neutral-900" font-medium py-10 outline-none w-full cursor-pointer transition-colors f-px-md hocus:bg-neutral-50>
              <Icon name="i-tabler:search" size-18 />
              {{ searchQuery }}
            </ComboboxItem>
            <ComboboxItem v-for="location in autocompleteResults" :key="location.uuid" :value="{ kind: 'location', uuid: location.uuid, name: location.name }" flex="~ col gap-2" text="f-sm neutral-800" bg="hover:neutral-50" py-10 text-left outline-none w-full cursor-pointer transition-colors items-start f-px-md>
              <span font-medium v-html="location.highlightedName || location.name" />
              <span text="f-xs neutral-600">{{ location.address }}</span>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
    <div flex="~ wrap gap-8" mt-4>
      <Toggle v-model="openNow" outline="~ neutral-400 1.5 reka-on:transparent" bg="neutral-100 hocus:neutral-200 reka-on:blue" text="14 neutral-800 hocus:neutral reka-on:white" font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs>
        {{ $t('filters.openNow') }}
      </Toggle>
      <Toggle v-model="walkable" outline="~ neutral-400 1.5 reka-on:reka-blue" bg="neutral-100 hocus:neutral-200" text="14 neutral-800 hocus:neutral" font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs>
        {{ $t('filters.walkableDistance') }}
      </Toggle>
    </div>
  </form>
</template>

<style>
mark {
  --uno: 'bg-blue-400 font-semibold px-2 rounded-2';
}
</style>

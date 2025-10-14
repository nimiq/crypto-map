<script setup lang="ts">
type SelectedItem
  = | { kind: 'location', uuid: string, name: string }
    | { kind: 'query', query: string }
const selectedItem = defineModel<SelectedItem>()

const { searchQuery, autocompleteResults } = useLocationSearch()

const inputRef = useTemplateRef<{ $el: HTMLInputElement }>('searchInput')

watch(selectedItem, (value) => {
  if (value?.kind === 'query') {
    searchQuery.value = value.query
  }
  else if (value?.kind === 'location') {
    searchQuery.value = value.name
  }
  inputRef.value?.$el?.blur()
})

function focusInput() {
  nextTick(() => {
    inputRef.value?.$el?.focus()
  })
}

defineExpose({ focusInput })
</script>

<template>
  <form w-full>
    <ComboboxRoot v-model="selectedItem" :display-value="selectedItem">
      <ComboboxAnchor relative>
        <ComboboxInput ref="searchInput" v-model="searchQuery" :placeholder="$t('search.placeholder')" name="query" px-16 py-12 outline-none border-none bg-transparent w-full text-f-sm style="color: var(--colors-neutral-900); outline: 1.5px solid var(--colors-neutral-300); border-radius: 8px" />
      </ComboboxAnchor>
      <ComboboxPortal>
        <ComboboxContent position="popper" side="bottom" :side-offset="8" w="$reka-combobox-trigger-width" rounded-8 max-h-320 shadow-lg z-50 of-auto style="outline: 1.5px solid var(--colors-neutral-200); background: var(--colors-white)">
          <ComboboxViewport>
            <ComboboxItem :key="searchQuery" :value="{ kind: 'query', query: searchQuery }" flex="~ items-center gap-8" font-medium py-12 outline-none w-full cursor-pointer transition-colors text-f-sm f-px-md style="color: var(--colors-neutral-900)" hocus:style="background: var(--colors-neutral-50)">
              <Icon name="i-tabler:search" size-18 />
              {{ searchQuery }}
            </ComboboxItem>
            <ComboboxItem v-for="location in autocompleteResults" :key="location.uuid" :value="{ kind: 'location', uuid: location.uuid, name: location.name }" flex="~ col gap-2" py-12 text-left outline-none w-full cursor-pointer transition-colors items-start text-f-sm f-px-md style="color: var(--colors-neutral-800)" hocus:style="background: var(--colors-neutral-50)">
              <span font-medium v-html="location.highlightedName || location.name" />
              <span text-f-xs style="color: var(--colors-neutral-600)">{{ location.address }}</span>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </form>
</template>

<style>
mark {
  background: var(--colors-blue-400);
  font-weight: 600;
  padding: 0 2px;
  border-radius: 2px;
}
</style>

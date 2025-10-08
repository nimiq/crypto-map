<script setup lang="ts">
const {
  searchQuery,
  autocompleteResults,
  showAutocomplete,
  fetchAutocomplete,
  handleSubmit,
} = useLocationSearch()

const emit = defineEmits<{
  selectLocation: [location: any]
}>()

function onSelectLocation(location: any) {
  emit('selectLocation', location)
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div relative>
      <input v-model="searchQuery" type="text" :placeholder="$t('search.placeholder')" nq-input-box @focus="searchQuery.length >= 2 && fetchAutocomplete()">
      <div v-if="showAutocomplete" position="absolute" outline="~ 1.5 neutral-200" mt-1 rounded-b-8 bg-white max-h-256 w-full shadow left-0 top-full z-50 of-auto>
        <button type="button" flex="~ items-center gap-8" text="f-sm neutral-900" bg="hover:neutral-50" font-medium py-10 outline-none w-full cursor-pointer transition-colors f-px-md @click="onSelectLocation(null)">
          <Icon name="i-tabler:search" size-18 />
          {{ searchQuery }}
        </button>
        <div v-if="autocompleteResults.length" border="t neutral-200" mx-2 />
        <button v-for="location in autocompleteResults" :key="location.uuid" type="button" flex="~ col gap-2" text="f-sm neutral-800" bg="hover:neutral-50" py-10 text-left outline-none w-full cursor-pointer transition-colors items-start f-px-md @click="onSelectLocation(location)">
          <span font-medium v-html="location.highlightedName || location.name" />
          <span text="f-xs neutral-600">{{ location.address }}</span>
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
mark {
  background: none;
  font-weight: 700;
}
</style>

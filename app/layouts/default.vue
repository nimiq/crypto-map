<script setup lang="ts">
// Use unified search composable
const { query, category, autocompleteResults, updateQuery, updateCategory }
  = useSearch()

// Navigation handler
async function handleNavigate(uuid: string) {
  await navigateTo(`/location/${uuid}`)
}
</script>

<template>
  <main f="$px-16/24" min-h-screen f-px-sm f-pt-md f-pb-2xl>
    <header>
      <Search
        :query="query"
        :category="category"
        :autocomplete-results="autocompleteResults"
        @update:query="updateQuery"
        @update:category="updateCategory"
        @navigate="handleNavigate"
      />
    </header>

    <slot />

    <DevConfig />
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}

body:has([data-reka-popper-content-wrapper]) main {
  --uno: bg-neutral-0;
}
</style>

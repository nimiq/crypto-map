<script setup lang="ts">
const { query, category, autocompleteResults } = useSearch()

async function handleNavigate(uuid: string) {
  await navigateTo(`/location/${uuid}`)
}
</script>

<template>
  <main f="$px-16/24" min-h-screen f-px-sm f-pt-md f-pb-2xl>
    <header>
      <Search
        v-model:query="query"
        v-model:category="category"
        :autocomplete-results
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

/* Commented out: Background color change when input is focused */
/* body:has([data-reka-popper-content-wrapper]) main {
  --uno: bg-neutral-0;
} */
</style>

<script setup lang="ts">
const { openNow, walkable } = useSearchFilters()
</script>

<template>
  <div flex="~ wrap gap-8" mt-4>
    <Toggle v-model="openNow" outline="~ neutral-400 1.5 reka-on:transparent" bg="neutral-100 hocus:neutral-200 reka-on:blue" text="14 neutral-800 hocus:neutral reka-on:white" font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs>
      {{ $t('filters.openNow') }}
    </Toggle>
    <Toggle v-model="walkable" outline="~ neutral-400 1.5 reka-on:reka-blue" bg="neutral-100 hocus:neutral-200" text="14 neutral-800 hocus:neutral" font-medium py-4 rounded-full cursor-pointer transition-colors f-px-2xs>
      {{ $t('filters.walkableDistance') }}
    </Toggle>
  </div>
</template>

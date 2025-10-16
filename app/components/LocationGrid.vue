<script setup lang='ts'>
interface Props { locations: any[], hasMore: boolean }

const props = defineProps<Props>()
const emit = defineEmits<{ loadMore: [] }>()
const { t } = useI18n()

const sentinelRef = ref<HTMLElement | null>(null)

// Trigger load more when sentinel is visible
useIntersectionObserver(sentinelRef, ([entry]) => {
  if (entry?.isIntersecting && props.hasMore)
    emit('loadMore')
}, { threshold: 0.5 })
</script>

<template>
  <div nq-raw>
    <div v-if='locations.length > 0' grid='~ cols-3 gap-x-16 gap-y-20'>
      <LocationCard v-for='location in locations' :key='location.uuid' :location w-full />
    </div>

    <!-- Sentinel element for intersection observer -->
    <div v-if='hasMore' ref='sentinelRef' flex='~ items-center justify-center' f-py-lg>
      <div flex='~ items-center gap-8' text-neutral-600>
        <div border='2 neutral-400 t-neutral-800' rounded-full size-16 animate-spin />
        <span text-f-sm>{{ t('locations.loadingMore') }}</span>
      </div>
    </div>
  </div>
</template>

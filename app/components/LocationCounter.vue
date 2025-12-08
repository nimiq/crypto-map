<script setup lang="ts">
import { consola } from 'consola'
import { animate, useMotionValue } from 'motion-v'

const { t } = useI18n()
const { mapInstance } = useMapControls()
const { locationCount, clusterCount } = useVisibleLocations()
const hasVisibleFeatures = computed(() => locationCount.value > 0 || clusterCount.value > 0)
const count = ref<number | null>(null)
const loading = ref(false)

// Animated count using motion value
const animatedCount = useMotionValue(0)
const displayCount = ref(0)

watch(count, (newCount) => {
  if (newCount === null)
    return
  animate(animatedCount, newCount, {
    duration: 0.15,
    ease: 'easeOut',
    onUpdate: (latest: number) => {
      displayCount.value = Math.round(latest)
    },
  })
}, { immediate: true })

const updateCount = useDebounceFn(async () => {
  if (!mapInstance.value)
    return

  const bounds = mapInstance.value.getBounds()
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()

  loading.value = true
  try {
    const { count: serverCount } = await $fetch('/api/locations/count', {
      query: {
        min_lat: sw.lat,
        min_lon: sw.lng,
        max_lat: ne.lat,
        max_lon: ne.lng,
      },
    })
    count.value = serverCount
  }
  catch (error) {
    consola.error('Failed to fetch location count:', error)
  }
  finally {
    loading.value = false
  }
}, 500) // Increased debounce for API calls

watch(mapInstance, (map) => {
  if (!map)
    return

  // Initial count
  map.once('idle', updateCount)

  // Listen for move events
  map.on('moveend', updateCount)
}, { immediate: true })
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="hasVisibleFeatures && count !== null && count > 0"
      flex pointer-events-none bottom-8 left-0 right-0 justify-center fixed z-10
    >
      <div
        bg="white/90 backdrop-blur"
        text="neutral-700 f-xs"
        outline="~ 1.5 neutral/8 offset--1.5"
        font-medium px-8 py-3 rounded-full pointer-events-auto shadow-lg
      >
        {{ t('locations.inArea', { count: displayCount }) }}
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  location: LocationDetailResponse
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'expand'): void
  (e: 'collapse'): void
}>()

const { t } = useI18n()
const { point: userLocation, source: locationSource } = useUserLocation()

const photoSrc = computed(() => {
  if (!props.location.photo && !props.location.gmapsPlaceId)
    return null
  return `/blob/location/${props.location.uuid}`
})

const hasPhotoError = ref(false)

// Reset photo error when location changes
watch(() => props.location.uuid, () => {
  hasPhotoError.value = false
})

const primaryCategory = computed(() => {
  if (props.location.primaryCategory)
    return props.location.primaryCategory
  if (props.location.categories && props.location.categories.length > 0) {
    return props.location.categories[0]
  }
  return null
})

const openingStatus = computed(() => {
  return getOpeningHoursStatus(props.location)
})

const statusInfo = computed(() => {
  const status = openingStatus.value

  if (status.variant === 'closed') {
    return { text: t(status.messageKey), color: 'text-red-600', bg: 'bg-red-50' }
  }
  if (status.variant === 'closing-soon') {
    return { text: t(status.messageKey), color: 'text-orange-600', bg: 'bg-orange-50' }
  }
  if (status.variant === 'open') {
    return { text: t(status.messageKey), color: 'text-green-600', bg: 'bg-green-50' }
  }
  return null
})

const walkingTime = computed(() => {
  // Only calculate if we have user location and it is precise (not IP based)
  if (!userLocation.value || locationSource.value === 'geoip' || locationSource.value === 'fallback')
    return null

  // Simple Haversine distance
  const R = 6371e3 // metres
  const φ1 = userLocation.value.lat * Math.PI / 180
  const φ2 = props.location.latitude * Math.PI / 180
  const Δφ = (props.location.latitude - userLocation.value.lat) * Math.PI / 180
  const Δλ = (props.location.longitude - userLocation.value.lng) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
    + Math.cos(φ1) * Math.cos(φ2)
    * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  // Average walking speed: ~83 meters/minute
  const minutes = Math.round(distance / 83)

  // Only show reasonable walking distances (e.g. < 1 hour)
  if (minutes > 60)
    return null

  return {
    text: `${minutes} min`,
    distance: distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`,
  }
})
</script>

<template>
  <div flex="~ col" outline="~ 1.5 neutral/4" rounded-t-20 bg-neutral-0 h-full max-h-96vh shadow relative isolate f-px-sm>
    <div mx-auto my-8 rounded-full bg-neutral-500 shrink-0 h-3 w-40 />

    <!-- Clickable area for expansion -->
    <div
      :class="!isExpanded && 'cursor-pointer'"
      @click="!isExpanded && emit('expand')"
    >
      <div flex="~ items-center gap-16" f-mt-xs>
        <h2 text="neutral f-xl" leading-tight font-bold flex-1 line-clamp-2 my-0>
          {{ location.name }}
        </h2>
        <button bg="neutral-300 hocus:neutral-400" outline="1.5 neutral/3" stack ml-auto p-8 rounded-full size-28 transition-colors aria-label="Close details" @click.stop="emit('close')">
          <Icon name="i-nimiq:nodes" text-neutral-800 size-14 rotate-z-180 />
        </button>

        <button bg="neutral-300 hocus:neutral-400" outline="1.5 neutral/3" stack rounded-full size-28 transition-colors aria-label="Close details" @click.stop="emit('close')">
          <Icon name="i-nimiq:cross" text-neutral-800 size-11 />
        </button>
      </div>

      <!-- Rating, count, and walking distance -->
      <div flex="~ items-center gap-8 wrap" text="neutral-700 f-sm" mt-4>
        <!-- Rating -->
        <div v-if="location.rating" flex="~ items-center gap-4">
          <span>{{ location.rating.toFixed(1) }}</span>
          <div flex="~ items-center gap-2" text-yellow-500>
            <Icon v-for="i in 5" name="i-nimiq:star" :key="i" :class="i <= Math.round(location.rating) ? 'text-gold' : 'text-neutral-200'" size-14 />
          </div>
          <span v-if="location.ratingCount">({{ location.ratingCount }})</span>
        </div>

        <!-- Walking distance -->
        <div v-if="walkingTime" flex="~ items-center gap-4">
          <Icon name="i-tabler:walk" size-18 />
          <span>{{ walkingTime.text }}</span>
        </div>
      </div>

      <!-- Main category with opening status badge -->
      <div v-if="primaryCategory || statusInfo" flex="~ items-center gap-8 wrap" mt-8>
        <div v-if="primaryCategory" text="neutral-800 f-sm">
          {{ primaryCategory.name }}
        </div>
        <div v-if="statusInfo" :class="[statusInfo.bg, statusInfo.color]" rounded-full px-12 py-4 text="f-sm" font-semibold>
          {{ statusInfo.text }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { DialogTitle } from 'reka-ui'

const props = defineProps<{
  location: LocationDetailResponse
  isExpanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const { point: userLocation, source: locationSource } = useUserLocation()

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
  <div flex="~ col" class="bg-white size-full">
    <!-- Header Section (always visible in compact) -->
    <div bg-white shrink-0 z-10 f-px-md f-pb-2xs>
      <!-- Title Row -->
      <div flex="~ items-start justify-between gap-4">
        <DialogTitle as="h2" text="f-xl neutral-900" leading-tight font-bold my-0 line-clamp-2>
          {{ location.name }}
        </DialogTitle>

        <div flex="~ gap-2 shrink-0">
          <button stack rounded-full bg="neutral-100 hocus:neutral-200" size-32 transition-colors @click.stop="emit('close')">
            <Icon name="i-nimiq:cross" text-neutral-800 size-14 />
          </button>
        </div>
      </div>

      <!-- Quick Info Row -->
      <div flex="~ wrap items-center gap-x-4 gap-y-2" mt-2 text="f-sm neutral-600">
        <!-- Rating -->
        <div v-if="location.rating" flex="~ items-center gap-1.5">
          <span text-neutral-900 font-medium>{{ location.rating.toFixed(1) }}</span>
          <div text-yellow-400 flex>
            <Icon name="i-nimiq:star" size-14 />
          </div>
          <span text-neutral-500>({{ location.ratingCount }})</span>
        </div>

        <!-- Walking Distance -->
        <div v-if="walkingTime" flex="~ items-center gap-1.5">
          <Icon name="i-tabler:walk" size-16 />
          <span>{{ walkingTime.text }}</span>
        </div>
      </div>

      <!-- Category & Status -->
      <div v-if="primaryCategory || statusInfo" flex="~ wrap items-center gap-3" mt-3>
        <span v-if="primaryCategory" text="f-sm neutral-600">
          {{ primaryCategory.name }}
        </span>
        <span
          v-if="statusInfo"
          :class="[statusInfo.bg, statusInfo.color]"
          text="f-xs" font-medium px-2.5 py-0.5 rounded-full
        >
          {{ statusInfo.text }}
        </span>
      </div>
    </div>

    <!-- Scrollable Content (visible on expansion) -->
    <div
      px-6 py-4 bg-white flex-1
      :class="isExpanded ? 'of-y-auto' : 'of-hidden'"
    >
      <div space-y-6>
        <!-- Debug Element -->
        <div border="2 dashed neutral-300" text-neutral-500 rounded-lg bg-neutral-100 flex h-500px w-full items-center justify-center>
          Debug Content Area (500px)
        </div>

        <div text="f-sm neutral-500">
          More details about {{ location.name }} would go here...
        </div>
      </div>
    </div>
  </div>
</template>

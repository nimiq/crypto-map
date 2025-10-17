<script setup lang='ts'>
const props = defineProps<{ location: any }>()
const { t } = useI18n()

const photoSrc = computed(() => {
  if (!props.location.photo && !props.location.gmapsPlaceId)
    return null
  return `location/${props.location.uuid}`
})

const secondaryInfo = computed(() => {
  const status = getOpeningHoursStatus(props.location)

  // Show 'Closed' if closed
  if (status.variant === 'closed') {
    return { text: t(status.messageKey), color: 'text-red-1100' }
  }

  // Show 'Closing soon' if closing soon
  if (status.variant === 'closing-soon') {
    return { text: t(status.messageKey), color: 'text-orange-1100' }
  }

  // Show distance if open and within 10 min walk
  if (status.variant === 'open' && props.location.distanceMeters) {
    const meters = props.location.distanceMeters
    // Average walking speed: ~83 meters/minute
    const walkingMinutes = Math.round(meters / 83)
    // Only show if less than 10 min walk (~830 meters)
    if (walkingMinutes < 10) {
      return { text: `${walkingMinutes} min`, color: 'text-neutral-700' }
    }
  }

  return null
})
</script>

<template>
  <NuxtLink :to="`/location/${location.uuid}`" :aria-label="`View ${location.name} details`" flex="~ col" group rounded-8 no-underline flex-shrink-0 w-140 of-hidden>
    <div aspect="4/3" rounded-4 bg-neutral-200 relative of-hidden>
      <NuxtImg
        v-if="photoSrc"
        :src="photoSrc"
        :alt="`Photo of ${location.name}`"
        loading="lazy"
        outline="1.5 offset--1.5 neutral-0/20"
        :style="{ viewTransitionName: `location-image-${location.uuid}` }"
        size-full
        object-cover
        f-text-2xs
      />
    </div>
    <div flex="~ col gap-4" p-4>
      <h3 text="f-sm neutral-900 left" font-semibold m-0 line-clamp-2>
        {{ location.name }}
      </h3>
      <div v-if="(location.primaryCategory || location.categories?.[0]) || secondaryInfo" flex="~ items-center gap-4 wrap" text="f-xs" lh-none>
        <span v-if="location.primaryCategory || location.categories?.[0]" text-neutral-700>{{ t(`categories.${(location.primaryCategory || location.categories[0]).id}`) }}</span>
        <span v-if="(location.primaryCategory || location.categories?.[0]) && secondaryInfo" text-neutral-700>•</span>
        <span v-if="secondaryInfo" :class="secondaryInfo.color" whitespace-nowrap>{{ secondaryInfo.text }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

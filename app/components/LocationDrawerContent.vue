<script setup lang="ts">
import { onLongPress } from '@vueuse/core'

const { location } = defineProps<{
  location: LocationDetailResponse
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t, locale } = useI18n()

// Long press to copy address
const addressRef = useTemplateRef<HTMLElement>('addressRef')
const showCopiedTooltip = ref(false)
const { copy } = useClipboard()

onLongPress(addressRef, async () => {
  if (location.address) {
    await copy(location.address)
    showCopiedTooltip.value = true
    setTimeout(() => showCopiedTooltip.value = false, 2500)
  }
}, { delay: 500 })

const primaryCategory = computed(() => {
  if (location.primaryCategory)
    return location.primaryCategory
  if (location.categories && location.categories.length > 0)
    return location.categories[0]
  return null
})

const openingStatus = computed(() => getOpeningHoursStatus(location))

const statusInfo = computed(() => {
  const status = openingStatus.value
  if (status.variant === 'closed')
    return { text: t(status.messageKey), color: 'text-red' }
  if (status.variant === 'closing-soon')
    return { text: t('hours.open'), color: 'text-green', extra: { text: t(status.messageKey), color: 'text-orange' } }
  if (status.variant === 'open')
    return { text: t(status.messageKey), color: 'text-green' }
  return null
})

// "Opens 9:00 Monday" for closed, "Closes 17:00" for open
const nextChangeText = computed(() => {
  const status = openingStatus.value
  if (!status.nextChange || !location.timezone)
    return null
  const next = status.nextChange
  const hours = next.getHours().toString().padStart(2, '0')
  const mins = next.getMinutes().toString().padStart(2, '0')

  if (status.variant === 'closed') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayKey = dayNames[next.getDay()]
    return `${t('hours.opensAt')} ${hours}:${mins} ${t(`days.${dayKey}`)}`
  }
  if (status.variant === 'open')
    return `${t('hours.closesAt')} ${hours}:${mins}`

  return null
})

// Star color based on rating
const starColor = computed(() => {
  const rating = location.rating
  if (!rating)
    return 'text-neutral'
  if (rating < 2)
    return 'text-red'
  if (rating < 4)
    return 'text-blue'
  return 'text-gold'
})

const hasRating = computed(() => location.rating && location.ratingCount)

const weeklyHours = computed(() => {
  if (!location.openingHours)
    return null
  return getWeeklyHours(location.openingHours)
})

const rotatedHours = computed(() => {
  if (!weeklyHours.value || !location.timezone)
    return null
  return rotateWeeklyHoursToToday(weeklyHours.value, location.timezone, locale.value)
})

const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const directionsUrl = computed(() => `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`)

const websiteDisplay = computed(() => {
  if (!location.website)
    return null
  try {
    const url = new URL(location.website)
    return url.hostname.replace('www.', '')
  }
  catch {
    return location.website
  }
})
</script>

<template>
  <div flex="~ col" pb-24 bg-neutral-0 size-full h-full relative of-x-clip of-y-auto class="scroll-container">
    <!-- Sticky Header -->
    <header bg-neutral-0 top-0 relative sticky z-10 f-px-md>
      <!-- Close Button -->
      <div class="close-button" flex="~ shrink-0 gap-8" right-16 top-4 absolute z-20>
        <button bg="neutral-500 hocus:neutral-600" stack rounded-full size-24 transition-colors @click.stop="emit('close')">
          <Icon name="i-nimiq:cross-bold" text-neutral-0 size-10 />
        </button>
      </div>

      <!-- Title -->
      <h2 leading-tight font-bold my-0 pr-40 pt-8 line-clamp-2 text="f-xl neutral">
        {{ location.name }}
      </h2>

      <!-- Collapsible Content -->
      <div class="collapsible-content" text-14 lh-none flex="~ col gap-6">
        <div v-if="primaryCategory || hasRating" data-rating mt-8 flex="~ wrap items-center gap-x-8 gap-y-4">
          <span v-if="primaryCategory" text-neutral-700 font-semibold>{{ primaryCategory.name }}</span>
          <div v-if="hasRating" flex="~ items-center gap-4">
            <Icon name="i-nimiq:star" :class="starColor" size-14 />
            <span font-medium :class="starColor">{{ location.rating!.toFixed(1) }}</span>
            <span text-neutral-700>({{ location.ratingCount }})</span>
          </div>
        </div>

        <!-- Opening Status -->
        <div v-if="statusInfo" data-status flex="~ items-center gap-6">
          <span :class="statusInfo.color" font-medium>{{ statusInfo.text }}</span>
          <template v-if="statusInfo.extra">
            <div aria-hidden rounded-full bg-neutral-600 size-3 />
            <span :class="statusInfo.extra.color" font-medium>{{ statusInfo.extra.text }}</span>
          </template>
          <template v-else-if="nextChangeText">
            <div aria-hidden rounded-full bg-neutral-600 size-3 />
            <span text-neutral-700>{{ nextChangeText }}</span>
          </template>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons" flex="~ gap-8">
        <NuxtLink :to="directionsUrl" target="_blank" outline="1.5 white/15 offset--1.5" external shadow nq-arrow nq-pill-lg nq-pill-blue>
          <Icon name="i-tabler:directions" size-16 />
          {{ t('location.directions') }}
        </NuxtLink>
        <NuxtLink :to="location.gmapsUrl" target="_blank" external nq-arrow nq-pill-lg nq-pill-secondary outline="1.5 white/20 offset--1.5">
          {{ t('location.openInGoogleMaps') }}
        </NuxtLink>
      </div>
    </header>

    <!-- Content -->
    <div pt-3>
      <PhotoCarousel v-if="location.photos && location.photos.length > 0" v-bind="location" mx--8 />
    </div>

    <div mt-24 flex-1 f-px-md>
      <!-- Weekly Hours -->
      <div v-if="rotatedHours" w-full space-y-8>
        <div v-for="(hours, idx) in rotatedHours.hours" :key="idx" flex="~ items-center gap-8" text-14>
          <span :class="hours ? 'text-neutral-700' : 'text-neutral-900'">{{ t(`days.${dayKeys[(new Date().getDay() + idx + 6) % 7]}`) }}</span>
          <svg text-neutral-500 flex-1 h-2 preserveAspectRatio="none"><line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" stroke-width="1" /></svg>
          <span :class="hours ? 'text-neutral-700' : 'text-red font-semibold'">
            {{ hours || t('hours.closed') }}
          </span>
        </div>
      </div>

      <!-- Contact Info -->
      <div v-if="location.address || location.website" mt-24 text="14 neutral">
        <TooltipProvider>
          <TooltipRoot :open="showCopiedTooltip">
            <TooltipTrigger as-child>
              <div v-if="location.address" ref="addressRef" text-neutral-700 cursor-pointer select-none>
                {{ location.address }}
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top" :side-offset="5">
                <Motion
                  :initial="{ opacity: 0, scale: 0.9, y: 4, filter: 'blur(2px)' }"
                  :animate="{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }"
                  :transition="{ type: 'spring', stiffness: 300, damping: 22 }"
                >
                  <div text-12 text-neutral-0 font-medium px-8 py-4 rounded-6 bg-neutral-900 shadow>
                    {{ t('location.addressCopied') }}
                  </div>
                </Motion>
              </TooltipContent>
            </TooltipPortal>
          </TooltipRoot>
        </TooltipProvider>
        <NuxtLink v-if="location.website" :to="location.website" target="_blank" external text-blue mt-6 block nq-arrow>
          {{ websiteDisplay }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Key animation values */
.scroll-container {
  --scroll-range: 156px;
  --collapsible-height: 0px;
  --padding-bottom-start: 24px;
  --padding-bottom-end: 20px;
  --buttons-margin-start: 24px;
  --buttons-margin-end: 20px;
  --border-bottom-width: 1px;
  scroll-behavior: smooth;

  /* Only rating OR only status: 14px (single row) */
  &:has([data-rating]):not(:has([data-status])),
  &:has([data-status]):not(:has([data-rating])) {
    --collapsible-height: 14px;
  }
  /* Both rating AND status: 34px (14 + 6 gap + 14) */
  &:has([data-rating]):has([data-status]) {
    --collapsible-height: 34px;
  }
}

@property --border-bottom-opacity {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

.scroll-container header {
  --border-bottom-opacity: 0;
  animation: collapse-header ease-out both;
  animation-timeline: scroll(nearest);
  animation-range: 0px var(--scroll-range);
  transform: translateY(0);
  padding-bottom: var(--padding-bottom-start);
  border-bottom: var(--border-bottom-width) solid
    color-mix(in srgb, var(--colors-neutral-500) calc(var(--border-bottom-opacity) * 100%), transparent);
  box-shadow:
    0px 18px 38px rgba(31 35 72 / calc(0.07 * var(--border-bottom-opacity))),
    0px 7px 8.5px rgba(31 35 72 / calc(0.04 * var(--border-bottom-opacity))),
    0px 2px 2.5px rgba(31 35 72 / calc(0.02 * var(--border-bottom-opacity)));

  h2,
  .close-button {
    animation: collapse-header-h2 ease-out both;
    animation-timeline: scroll(nearest);
    animation-range: 0px var(--scroll-range);
    transform: translateY(0);
  }

  .collapsible-content {
    animation: collapse-content ease-out both;
    animation-timeline: scroll(nearest);
    animation-range: 0px calc(var(--scroll-range) * 0.55);
    transform: scale(100%) translateY(0);
    filter: blur(0);
    transform-origin: top left;
  }

  .action-buttons {
    animation: collapse-buttons ease-out both;
    animation-timeline: scroll(nearest);
    animation-range: 0px var(--scroll-range);
    margin-top: var(--buttons-margin-start);
  }
}

@keyframes collapse-header {
  to {
    transform: translateY(calc(-1 * var(--collapsible-height)));
    --border-bottom-opacity: 1;
    padding-bottom: var(--padding-bottom-end);
  }
}

@keyframes collapse-header-h2 {
  to {
    transform: translateY(var(--collapsible-height));
  }
}

@keyframes collapse-content {
  to {
    opacity: 0;
    transform: scale(96%) translateY(var(--collapsible-height));
    filter: blur(3px);
  }
}

@keyframes collapse-buttons {
  to {
    margin-top: var(--buttons-margin-end);
  }
}
</style>

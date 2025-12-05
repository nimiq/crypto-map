<script setup lang="ts">
import { onLongPress } from '@vueuse/core'

const { location, snap } = defineProps<{
  location: LocationDetailResponse
  snap: string | number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t, locale } = useI18n()

// Simple derived values
const primaryCategory = computed(() => location.primaryCategory ?? location.categories?.[0] ?? null)
const hasRating = computed(() => location.rating && location.ratingCount)
const scrollClass = computed(() => {
  if (snap === '450px')
    return 'of-y-auto max-h-[calc(450px-40px)]' // 40px for handle
  return 'of-y-auto'
})
const starColor = computed(() => {
  if (!location.rating)
    return 'text-neutral'
  if (location.rating <= 3)
    return 'text-red'
  if (location.rating < 4)
    return 'text-blue'
  return 'text-gold'
})
const directionsUrl = computed(() => `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`)
const websiteDisplay = computed(() => {
  if (!location.website)
    return null
  try {
    return new URL(location.website).hostname.replace('www.', '')
  }
  catch {
    return location.website
  }
})
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function useOpeningHours() {
  const status = computed(() => getOpeningHoursStatus(location))

  const statusInfo = computed(() => {
    const s = status.value
    if (s.variant === 'closed')
      return { text: t(s.messageKey), color: 'text-red' }
    if (s.variant === 'closing-soon')
      return { text: t(s.messageKey), color: 'text-orange' }
    if (s.variant === 'open')
      return { text: t(s.messageKey), color: 'text-green' }
    return null
  })

  const nextChangeText = computed(() => {
    const s = status.value
    if (!s.nextChange || !location.timezone)
      return null
    const next = s.nextChange
    const time = `${next.getHours().toString().padStart(2, '0')}:${next.getMinutes().toString().padStart(2, '0')}`
    if (s.variant === 'closed') {
      const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][next.getDay()]
      return `${t('hours.opensAt')} ${time} ${t(`days.${dayKey}`)}`
    }
    return s.variant === 'open' ? `${t('hours.closesAt')} ${time}` : null
  })

  const weeklyHours = computed(() => {
    if (!location.openingHours)
      return null
    const hours = getWeeklyHours(location.openingHours)
    return hours.some(h => h) ? hours : null // Only show if at least one day has hours
  })
  const rotatedHours = computed(() => weeklyHours.value && location.timezone ? rotateWeeklyHoursToToday(weeklyHours.value, location.timezone, locale.value) : null)

  return { statusInfo, nextChangeText, rotatedHours }
}

function useAddressCopy() {
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

  return { addressRef, showCopiedTooltip }
}

const { statusInfo, nextChangeText, rotatedHours } = useOpeningHours()
const { addressRef, showCopiedTooltip } = useAddressCopy()
</script>

<template>
  <div flex="~ col" pb-24 bg-neutral-0 w-full relative of-x-hidden :class="scrollClass">
    <header bg-neutral-0 relative f-px-md>
      <!-- Close Button -->
      <div flex="~ shrink-0 gap-8" right-16 top-4 absolute z-20>
        <button bg="neutral-500 hocus:neutral-600" stack rounded-full shrink-0 size-24 transition-colors @click.stop="emit('close')">
          <Icon name="i-nimiq:cross-bold" text-neutral-0 size-10 />
        </button>
      </div>

      <!-- Title -->
      <h2 leading-tight font-bold my-0 pr-40 pt-8 line-clamp-2 text="f-xl neutral">
        {{ location.name }}
      </h2>

      <!-- Category, Rating & Opening Status -->
      <div flex="~ col gap-6" text-14 lh-none>
        <div v-if="primaryCategory || hasRating" mt-4 flex="~ wrap items-center gap-x-8 gap-y-4">
          <span v-if="primaryCategory" text-neutral-700 font-semibold>{{ primaryCategory.name }}</span>
          <div v-if="hasRating" flex="~ items-center gap-4">
            <Icon name="i-nimiq:star" :class="starColor" size-14 />
            <span font-medium :class="starColor">{{ location.rating!.toFixed(1) }}</span>
            <span text-neutral-700>({{ location.ratingCount }})</span>
          </div>
        </div>

        <!-- Opening Status -->
        <div v-if="statusInfo" flex="~ items-center gap-6">
          <span :class="statusInfo.color" font-medium>{{ statusInfo.text }}</span>
          <template v-if="nextChangeText">
            <div aria-hidden rounded-full bg-neutral-600 size-3 />
            <span text-neutral-700>{{ nextChangeText }}</span>
          </template>
        </div>
      </div>

      <!-- Action Buttons -->
      <div flex="~ gap-8" mt-12>
        <NuxtLink :to="directionsUrl" target="_blank" outline="1.5 neutral-0/15 offset--1.5" external shadow nq-arrow nq-pill nq-pill-blue @click.stop>
          <Icon name="i-tabler:directions" size-16 />
          {{ t('location.directions') }}
        </NuxtLink>
        <NuxtLink v-if="location.gmapsUrl" :to="location.gmapsUrl" target="_blank" external nq-arrow nq-pill nq-pill-secondary outline="1.5 neutral-0/20 offset--1.5" @click.stop>
          {{ t('location.openInGoogleMaps') }}
        </NuxtLink>
      </div>
    </header>

    <div pt-24>
      <PhotoCarousel v-if="location.gmapsPlaceId" v-bind="location" mx--8 />
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

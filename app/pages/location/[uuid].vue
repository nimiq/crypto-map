<script setup lang="ts">
import { toZonedTime } from 'date-fns-tz'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const uuid = computed(() => route.params.uuid as string)

const { data: location, status } = useLazyFetch<LocationDetailResponse>(() => `/api/locations/${uuid.value}`, {
  watch: [uuid],
})

watch(() => [location.value, status.value], () => {
  if (!location.value && status.value === 'success') {
    throw createError({ statusCode: 404, statusMessage: 'Location not found' })
  }
})

const photoUrl = computed(() => location.value ? `/images/location/${location.value.uuid}` : null)

const { status: openingStatus } = location.value?.openingHours && location.value?.timezone
  ? useOpeningHoursStatus(() => location.value!.openingHours!, () => location.value!.timezone!)
  : { status: ref(null) }

const weeklyHours = computed(() => {
  if (!location.value?.openingHours || !location.value?.timezone)
    return { entries: [], separatorAfterIndex: null }

  const hours = getWeeklyHours(location.value.openingHours)
  const { hours: rotatedHours, separatorAfterIndex } = rotateWeeklyHoursToToday(hours, location.value.timezone, locale.value)

  // Rotate day keys to match rotated hours
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const today = toZonedTime(new Date(), location.value.timezone)
  const dayOfWeek = today.getDay()
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const rotatedDayKeys = [...dayKeys.slice(todayIndex), ...dayKeys.slice(0, todayIndex)]

  const entries = rotatedHours.map((hoursStr, index) => {
    const day = t(`days.${rotatedDayKeys[index]}`)

    // Parse hours string like "09:00 - 18:00" or "09:00 - 12:00, 14:00 - 18:00"
    if (!hoursStr) {
      return { day, timeRanges: [], isClosed: true }
    }

    // Split by comma for multiple time ranges (e.g., split shifts)
    const ranges = hoursStr.split(',').map((range) => {
      const [start, end] = range.trim().split(' - ')
      return { start: start?.trim(), end: end?.trim() }
    }).filter(range => range.start && range.end)

    return { day, timeRanges: ranges, isClosed: false }
  })

  return { entries, separatorAfterIndex }
})

const statusColorClass = computed(() => {
  if (!openingStatus.value)
    return 'bg-neutral-200 text-neutral-700'
  switch (openingStatus.value.variant) {
    case 'success': return 'bg-green-400 text-green-1100 outline-green-500'
    case 'warning': return 'bg-orange-400 text-orange-1100 outline-orange-500'
    case 'neutral': return 'bg-neutral-400 text-neutral-800 outline-neutral-500'
    default: return 'bg-neutral-200 text-neutral-700'
  }
})

const websiteInfo = computed<WebsiteInfo | null>(() => location.value?.website ? parseWebsiteUrl(location.value.website) : null)

function handleBack() {
  if (window.history.length > 1) {
    router.back()
  }
  else {
    router.push('/')
  }
}
</script>

<template>
  <div v-if="status === 'pending'" f-py-lg>
    <div rounded-8 bg-neutral-200 aspect="16/9" w-full animate-pulse f-mb-md />
    <div rounded-8 bg-neutral-200 h-32 w="3/4" animate-pulse f-mb-sm />
    <div rounded-8 bg-neutral-200 h-20 w="1/2" animate-pulse />
  </div>

  <div v-else-if="location" flex="~ col" f-mt-md>
    <!-- Hero Image with Back Button -->
    <div relative>
      <button flex="~ items-center justify-center" bg="white/25" outline="1.5 white/8 offset--1.5 ~" shadow-md rounded-full size-40 transition-colors left-8 top-8 absolute z-10 backdrop-blur-xs @click="handleBack">
        <Icon name="i-tabler:arrow-left" text-20 text-neutral-0 />
      </button>
      <img v-if="photoUrl" :src="photoUrl" :alt="`Photo of ${location.name}`" rounded-12 aspect="16/9" w-full object-cover :style="{ viewTransitionName: `location-image-${location.uuid}` }">
      <div v-else aspect="16/9" bg-neutral-200 w-full />
    </div>

    <!-- Location Info -->
    <div flex="~ col gap-12" f-mt-md>
      <div flex="~ col gap-8">
        <h1 text="neutral-900 f-lg" lh-tight font-bold m-0 :style="{ viewTransitionName: `location-name-${location.uuid}` }">
          {{ location.name }}
        </h1>
        <p text="neutral-800 f-sm" m-0>
          {{ location.address }}
        </p>
      </div>

      <!-- Status & Rating -->
      <div flex="~ items-center gap-16 wrap">
        <span v-if="openingStatus" :class="statusColorClass" font-medium px-8 py-3 rounded-full text-f-xs outline="1.5 ~">
          {{ openingStatus.label }}
        </span>
        <span v-if="location.rating" flex="~ items-center gap-8" text="neutral-700 f-xs">
          <Icon name="i-tabler:star-filled" text-14 text-gold />
          {{ location.rating }}
        </span>
      </div>
    </div>

    <div flex="~ items-center gap-20 wrap" f-mt-md>
      <NuxtLink v-if="location.gmapsUrl" :to="location.gmapsUrl" external nq-arrow nq-pill-blue target="_blank">
        <Icon name="i-nimiq:logos-gmaps-pin-mono" text-12 mr-4 />
        {{ t('location.viewOnMaps') }}
      </NuxtLink>

      <NuxtLink v-if="websiteInfo" :to="websiteInfo.url" :nq-arrow="websiteInfo.hasArrow ? '' : undefined" external font-medium bg-transparent after:op-90 un-text="blue-1100 f-sm" target="_blank" flex="~ items-center gap-8">
        <Icon v-if="websiteInfo.icon" :name="websiteInfo.icon" text-14 />
        {{ websiteInfo.displayText }}
      </NuxtLink>
    </div>

    <!-- Categories -->
    <div v-if="location.categories && location.categories.length > 0" flex="~ col gap-8" f-mt-lg>
      <h2 text="neutral-800 11" my-0 nq-label>
        {{ t('location.categories') }}
      </h2>
      <div flex="~ wrap gap-8">
        <NuxtLink v-for="category in location.categories" :key="category.id" :to="`/?category=${category.id}`" flex="~ items-center gap-6" px-8 py-3 rounded-full outline="1.5 neutral/2 dark:white/4 ~ offset--1.5" bg="neutral-300 hocus:neutral-400" un-text="neutral-800 f-xs" no-underline transition-colors>
          <Icon :name="category.icon" text-12 />
          {{ t(`categories.${category.id}`) }}
        </NuxtLink>
      </div>
    </div>

    <!-- Opening Hours -->
    <div v-if="weeklyHours.entries.length > 0" flex="~ col gap-8" f-mt-lg>
      <h2 text="neutral-800 11" my-0 nq-label>
        {{ t('location.openingHours') }}
      </h2>
      <div flex="~ col gap-4" text="neutral-700 f-xs">
        <template v-for="(entry, i) in weeklyHours.entries" :key="i">
          <div flex="~ justify-between gap-16">
            <span font-medium>{{ entry.day }}</span>
            <span v-if="entry.isClosed" text-neutral-700 italic>{{ t('hours.closed') }}</span>
            <span v-else flex="~ gap-4">
              <template v-for="(range, rangeIdx) in entry.timeRanges" :key="rangeIdx">
                <span v-if="rangeIdx > 0">, </span>
                <NuxtTime :datetime="`2024-01-01T${range.start}:00`" hour="2-digit" minute="2-digit" />
                <span> - </span>
                <NuxtTime :datetime="`2024-01-01T${range.end}:00`" hour="2-digit" minute="2-digit" />
              </template>
            </span>
          </div>
          <hr v-if="weeklyHours.separatorAfterIndex === i" border-t="1 neutral-400" my-4>
        </template>
      </div>
    </div>
  </div>
</template>

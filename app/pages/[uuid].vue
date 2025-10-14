<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const uuid = computed(() => route.params.uuid as string)

const { data: location, status } = await useFetch(`/api/locations/${uuid.value}`)

if (!location.value && status.value === 'success')
  throw createError({ statusCode: 404, statusMessage: 'Location not found' })

const photoUrl = computed(() => location.value ? `/images/location/${location.value.uuid}` : null)

const { status: openingStatus } = location.value?.openingHours && location.value?.timezone
  ? useOpeningHoursStatus(() => location.value!.openingHours!, () => location.value!.timezone!)
  : { status: ref(null) }

const weeklyHours = computed(() => {
  if (!location.value?.openingHours) return []
  const hours = getWeeklyHours(location.value.openingHours)
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return hours.map((hours, index) => ({ day: t(`days.${dayKeys[index]}`), hours: hours || t('hours.closed') }))
})

const statusColorClass = computed(() => {
  if (!openingStatus.value) return 'bg-neutral-200 text-neutral-700'
  switch (openingStatus.value.variant) {
    case 'success': return 'bg-green-400 text-green-1100'
    case 'warning': return 'bg-orange-400 text-orange-1100 outline-orange-500'
    case 'neutral': return 'bg-neutral-400 text-neutral-800'
    default: return 'bg-neutral-200 text-neutral-700'
  }
})

function handleBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
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

  <div v-else-if="location" flex="~ col" f-mt-lg>
    <!-- Hero Image with Back Button -->
    <div relative rounded-12 of-hidden>
      <button @click="handleBack" absolute top-8 left-8 z-10 flex="~ items-center justify-center" size-40 rounded-full bg="white/5 hover:white/50" outline="1.5 neutral/10 offset--1.5 ~" backdrop-blur-sm transition-colors shadow-md>
        <Icon name="i-tabler:arrow-left" text-20 text-neutral-900 />
      </button>
      <img v-if="photoUrl" :src="photoUrl" :alt="`Photo of ${location.name}`" aspect="16/9" w-full object-cover :style="{ viewTransitionName: `location-image-${location.uuid}` }">
      <div v-else aspect="16/9" w-full bg-neutral-200 />
    </div>

    <!-- Location Info -->
    <div flex="~ col gap-12" f-mt-md>
      <div flex="~ col gap-8">
        <h1 text="neutral-900 f-lg" font-bold m-0 lh-tight :style="{ viewTransitionName: `location-name-${location.uuid}` }">
          {{ location.name }}
        </h1>
        <p text="neutral-800 f-sm" m-0>
          {{ location.address }}
        </p>
      </div>

      <!-- Status & Rating -->
      <div flex="~ items-center gap-16 wrap">
        <span v-if="openingStatus" :class="statusColorClass" px-8 py-3 rounded-full text-f-xs font-medium outline="1.5 ~">
          {{ openingStatus.label }}
        </span>
        <span v-if="location.rating" flex="~ items-center gap-8" text="neutral-700 f-xs">
          <Icon name="i-tabler:star-filled" text-14 text-gold />
          {{ location.rating }}
        </span>
      </div>
    </div>

    <div flex="~ items-center gap-16" f-mt-md>
      <NuxtLink nq-pill-blue nq-arrow v-if="location.gmapsUrl" :to="location.gmapsUrl" external target="_blank">
        <Icon name="i-nimiq:logos-gmaps" text-20 />
        {{ t('location.viewOnMaps') }}
      </NuxtLink>

      <NuxtLink nq-pill-tertiary bg-transparent v-if="location.website" :to="location.website" external target="_blank">
        {{ t('location.visitWebsite') }}
        <Icon name="i-tabler:external-link" text-20 />
      </NuxtLink>
    </div>
 
    <!-- Categories -->
    <div v-if="location.categories && location.categories.length > 0" flex="~ col gap-8" f-mt-lg>
      <h2 text="neutral-800 11" nq-label>
        {{ t('location.categories') }}
      </h2>
      <div flex="~ wrap gap-8">
        <NuxtLink v-for="category in location.categories" :key="category.id" :to="`/?category=${category.id}`" flex="~ items-center gap-6" px-12 py-6 rounded-8 outline="1.5 white/4 ~ offset--1.5" bg="neutral-200 hover:neutral-300" un-text="neutral-800 f-xs" no-underline transition-colors>
          <Icon :name="category.icon" text-16 />
          {{ t(`categories.${category.id}`) }}
        </NuxtLink>
      </div>
    </div>

    <!-- Opening Hours -->
    <div v-if="weeklyHours.length > 0" flex="~ col gap-8" f-mt-lg>
      <h2 text="neutral-800 11" nq-label>
        {{ t('location.openingHours') }}
      </h2>
      <div flex="~ col gap-4" text="neutral-700 f-xs">
        <div v-for="(entry, i) in weeklyHours" :key="i" flex="~ justify-between gap-16">
          <span font-medium>{{ entry.day }}</span>
          <span :class="entry.hours === t('hours.closed') ? 'text-neutral-500 italic' : ''">{{ entry.hours }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

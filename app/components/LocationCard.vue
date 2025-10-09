<script setup lang="ts">
const props = defineProps<{ location: any }>()

const photoUrl = computed(() => {
  if (!props.location.photo && !props.location.gmapsPlaceId)
    return null
  return `/images/location/${props.location.uuid}`
})
</script>

<template>
  <a :href="location.gmapsUrl" :aria-label="`View ${location.name} on Google Maps`" target="_blank" rel="noopener noreferrer" outline="~ 1 neutral-200" flex="~ col" group p-0 rounded-12 bg-white no-underline h-full block overflow-hidden nq-hoverable>
    <div aspect="16/9" bg-neutral-200 flex-shrink-0 relative overflow-hidden>
      <NuxtImg v-if="photoUrl" :src="photoUrl" :alt="`Photo of ${location.name}`" loading="lazy" h-full w-full transition-transform duration-300 object-cover group-hover:scale-105 />
      <div v-if="location.rating" flex="~ items-center gap-4" bg="white/95" text="neutral-900 f-sm" shadow-sm font-semibold px-8 py-4 rounded-full right-8 top-8 absolute backdrop-blur-sm outline="1.5 offset--1.5 neutral/10">
        <Icon name="i-nimiq:star" text-gold size-16 />
        <span>{{ location.rating }}</span>
      </div>
    </div>
    <div flex="~ col gap-12" flex-1 f-p-md>
      <h3 text="f-lg neutral-900" font-bold m-0 line-clamp-1>{{ location.name }}</h3>
      <div v-if="location.openingHours" flex="~ items-center gap-8 wrap">
        <span class="font-semibold px-8 py-4 rounded-full whitespace-nowrap text-f-xs" :class="[location.hoursStatus.variant === 'open' && 'bg-green-400 text-green-1100 outline-1.5 outline-green-400', location.hoursStatus.variant === 'closing-soon' && 'bg-orange-400 text-orange-1100 outline-1.5 outline-orange-400', location.hoursStatus.variant === 'closed' && 'bg-neutral-200 text-neutral-800', location.hoursStatus.variant === 'unavailable' && 'bg-neutral-200 text-neutral-700']">{{ $t(location.hoursStatus.messageKey) }}</span>
        <span v-if="location.hoursStatus.nextChange" text="f-xs neutral-800" whitespace-nowrap>{{ location.hoursStatus.isOpen ? 'Closes' : 'Opens' }} at <NuxtTime :datetime="location.hoursStatus.nextChange" hour="numeric" minute="2-digit" /></span>
      </div>
      <div flex="~ col gap-6">
        <div flex="~ items-start gap-8">
          <Icon name="i-tabler:map-pin" text-neutral-700 mt-2 flex-shrink-0 size-16 />
          <p text="neutral-800 f-sm" m-0 flex-1 line-clamp-2>{{ location.address }}</p>
        </div>
        <div v-if="location.distanceMeters !== undefined" flex="~ items-center gap-8" ml-24>
          <span text="neutral-600 f-xs" font-medium>
            {{ location.distanceMeters < 1000 ? `${Math.round(location.distanceMeters)} m` : `${(location.distanceMeters / 1000).toFixed(1)} km` }} away
          </span>
        </div>
      </div>
      <div flex="~ wrap gap-6">
        <span v-for="cat in location.categories.slice(0, 3)" :key="cat.id" text="f-xs neutral-800" flex="~ items-center gap-4" font-medium px-8 py-4 rounded-full bg-neutral-100>
          <Icon :name="cat.icon" size-12 />
          {{ $te(`categories.${cat.id}`) ? $t(`categories.${cat.id}`) : cat.name }}
        </span>
        <span v-if="location.categories.length > 3" text="f-xs neutral-700" font-medium px-8 py-4>+{{ location.categories.length - 3 }} more</span>
      </div>
      <div flex="~ gap-8 items-center" mt-auto pt-8>
        <span text="blue f-sm" font-semibold nq-arrow>View on Maps</span>
        <a v-if="location.website" :href="location.website" :aria-label="`Visit ${location.name} website`" target="_blank" rel="noopener noreferrer" un-text="neutral-600 hover:neutral-900 f-sm" font-medium ml-auto no-underline transition-colors nq-arrow @click.stop>Website</a>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
const props = defineProps<{ location: any }>()

const photoUrl = computed(() => {
  if (!props.location.photo && !props.location.gmapsPlaceId)
    return null
  return `/images/location/${props.location.uuid}`
})
</script>

<template>
  <a :href="location.gmapsUrl" :aria-label="`View ${location.name} on Google Maps`" target="_blank" rel="noopener noreferrer" outline="~ 1 neutral-200" flex="~ col" group rounded-8 bg-white no-underline flex-shrink-0 w-140 overflow-hidden nq-hoverable>
    <div aspect="4/3" bg-neutral-200 relative overflow-hidden>
      <NuxtImg v-if="photoUrl" :src="photoUrl" :alt="`Photo of ${location.name}`" loading="lazy" h-full w-full transition-transform duration-300 object-cover group-hover:scale-105 />
      <div v-if="location.rating" flex="~ items-center gap-4" bg="white/95" text="neutral-900 f-xs" shadow-sm font-semibold px-6 py-2 rounded-full right-6 top-6 absolute backdrop-blur-sm outline="1.5 offset--1.5 neutral/10">
        <Icon name="i-nimiq:star" text-gold size-12 />
        <span>{{ location.rating }}</span>
      </div>
    </div>
    <div flex="~ col gap-4" f-p-sm>
      <h3 text="f-sm neutral-900" font-bold m-0 line-clamp-1>{{ location.name }}</h3>
      <div v-if="location.categories && location.categories.length > 0" flex="~ items-center gap-4">
        <Icon :name="location.categories[0].icon" text-neutral-600 size-14 />
        <span text="f-xs neutral-700" line-clamp-1>{{ location.categories[0].name }}</span>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
const props = defineProps<{ location: any }>()

const photoUrl = computed(() => {
  if (!props.location.photo && !props.location.gmapsPlaceId)
    return null
  return `/images/location/${props.location.uuid}`
})
</script>

<template>
  <NuxtLink :to="location.gmapsUrl" :aria-label="`View ${location.name} on Google Maps`" target="_blank" outline="~ 1 neutral-200" flex="~ col" group rounded-8 no-underline flex-shrink-0 w-140 of-hidden>
    <div aspect="4/3" bg-neutral-200 relative overflow-hidden>
      <img v-if="photoUrl" :src="photoUrl" :alt="`Photo of ${location.name}`" loading="lazy" class="size-full object-cover rounded-4" />
      <div v-if="location.rating" flex="~ items-center gap-4" bg="white/95" text="neutral-900 f-xs" shadow-sm font-semibold px-6 py-2 rounded-full right-6 top-6 absolute backdrop-blur-sm outline="1.5 offset--1.5 neutral/10">
        <Icon name="i-nimiq:star" text-gold size-12 />
        <span>{{ location.rating }}</span>
      </div>
    </div>
    <div flex="~ col gap-4" p-4>
      <h3 text="f-sm neutral-900" font-semibold m-0 line-clamp-2>{{ location.name }}</h3>
    </div>
  </NuxtLink>
</template>

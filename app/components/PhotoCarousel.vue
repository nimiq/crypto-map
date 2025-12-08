<script setup lang="ts">
const { uuid } = defineProps<{ uuid: string }>()

// Try up to 3 photos (blob endpoint limits to 0-2)
const MAX_PHOTOS = 3
const failedPhotos = ref<boolean[]>([false, false, false])

function onError(index: number) {
  failedPhotos.value[index] = true
}

const availablePhotos = computed(() => Array.from({ length: MAX_PHOTOS }, (_, i) => i).filter(i => !failedPhotos.value[i]))
</script>

<template>
  <div v-if="availablePhotos.length > 0" flex="~ gap-8" scroll-pe-24 scroll-ps-24 of-x-auto nq-scrollbar-hide snap="x mandatory" empty="hidden !p-0 !m-0">
    <div v-for="(photoIndex, i) in availablePhotos" :key="photoIndex" shrink-0 snap-start first:ps-24 last:pe-24>
      <img
        :src="`/blob/location/${uuid}/${photoIndex}`"
        :alt="`Photo ${photoIndex + 1}`"
        :loading="i === 0 ? 'eager' : 'lazy'"
        w-280 aspect-0.8 object-cover f-rounded-lg outline="1.5 offset--1.5 white/14"
        @error="onError(photoIndex)"
      >
    </div>
  </div>
</template>

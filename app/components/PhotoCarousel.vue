<script setup lang="ts">
import { NuxtImg } from '#components'

const { uuid } = defineProps<{ uuid: string }>()

// Try up to 3 photos (blob endpoint limits to 0-2)
const MAX_PHOTOS = 3
const failedPhotos = ref<Set<number>>(new Set())

function onError(index: number) {
  failedPhotos.value.add(index)
}

const availablePhotos = computed(() => Array.from({ length: MAX_PHOTOS }, (_, i) => i).filter(i => !failedPhotos.value.has(i)))
</script>

<template>
  <div v-if="availablePhotos.length > 0" flex="~ gap-8" scroll-pe-24 scroll-ps-24 of-x-auto nq-scrollbar-hide snap="x mandatory" empty="hidden !p-0 !m-0">
    <div v-for="index in availablePhotos" :key="index" shrink-0 snap-start first:ps-24 last:pe-24>
      <NuxtImg
        :src="`/blob/location/${uuid}/${index}`"
        provider="cloudflareOnProd"
        :alt="`Photo ${index + 1}`"
        w-280 aspect-0.8 object-cover f-rounded-lg outline="1.5 offset--1.5 white/14"
        @error="onError(index)"
      />
    </div>
  </div>
</template>

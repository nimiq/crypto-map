<script setup lang="ts">
import { NuxtImg } from '#components'

const { uuid, photos } = defineProps<{ uuid: string, photos?: string[] | null }>()

const failedPhotos = ref<Set<number>>(new Set())

function onError(index: number) {
  failedPhotos.value.add(index)
}

const isExternalPhoto = computed(() => photos?.[0]?.startsWith('http'))
const availablePhotos = computed(() => {
  if (!photos?.length)
    return []
  return photos.map((_, i) => i).filter(i => !failedPhotos.value.has(i))
})
</script>

<template>
  <div v-if="availablePhotos.length > 0" flex="~ gap-8" scroll-pe-24 scroll-ps-24 of-x-auto nq-scrollbar-hide snap="x mandatory">
    <div v-for="index in availablePhotos" :key="index" shrink-0 snap-start first:ps-24 last:pe-24>
      <component
        :is="isExternalPhoto ? 'img' : NuxtImg"
        :src="isExternalPhoto ? photos![index] : `/blob/location/${uuid}/${index}`"
        :provider="isExternalPhoto ? undefined : 'cloudflareOnProd'"
        :alt="`Photo ${index + 1}`"
        w-280 aspect-0.8 object-cover f-rounded-lg outline="1.5 offset--1.5 white/14"
        @error="onError(index)"
      />
    </div>
  </div>
</template>

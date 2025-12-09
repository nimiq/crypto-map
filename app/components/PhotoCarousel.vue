<script setup lang="ts">
const { uuid } = defineProps<{ uuid: string }>()
const { t } = useI18n()

// Try up to 3 photos (blob endpoint limits to 0-2)
const MAX_PHOTOS = 3
const failedPhotos = ref<boolean[]>([false, false, false])

function onError(index: number) {
  failedPhotos.value[index] = true
}

const availablePhotos = computed(() => Array.from({ length: MAX_PHOTOS }, (_, i) => i).filter(i => !failedPhotos.value[i]))
</script>

<template>
  <div v-if="availablePhotos.length > 0" flex="~ gap-8" pe-24 ps-24 of-x-auto nq-scrollbar-hide snap="x mandatory" empty="hidden !p-0 !m-0">
    <img
      v-for="(photoIndex, i) in availablePhotos"
      :key="photoIndex"
      :src="`/blob/location/${uuid}/${photoIndex}`"
      :alt="t('photo.alt', { number: photoIndex + 1 })"
      :loading="i === 0 ? 'eager' : 'lazy'"
      rounded-6 shrink-0 w-280 object-cover snap-center outline="1.5 offset--1.5 white/14"
      @error="onError(photoIndex)"
    >
  </div>
</template>

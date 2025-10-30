<script setup lang="ts">
const { zoomIn, zoomOut, flyTo } = useMapControls()
const { hasPointer } = usePointerType()
const { isLocating, locateMe, point } = useUserLocation()

function handleLocateMe() {
  locateMe()
  watchOnce(point, () => {
    flyTo(point.value)
  })
}
</script>

<template>
  <div flex="~ col gap-8" bottom-16 right-16 absolute z-10>
    <DevConfig />
    <template v-if="hasPointer">
      <button stack outline="~ 1.5 neutral-200 hocus:neutral-900" rounded-full bg="neutral-0 hocus:neutral-50" size-40 cursor-pointer shadow transition-colors @click="zoomIn">
        <Icon name="i-tabler:plus" text-neutral size-20 />
      </button>
      <button stack outline="~ 1.5 neutral-200 hocus:neutral-900" rounded-full bg="neutral-0 hocus:neutral-50" size-40 cursor-pointer shadow transition-colors @click="zoomOut">
        <Icon name="i-tabler:minus" text-neutral size-20 />
      </button>
    </template>
    <button stack outline="~ 1.5 neutral-200 hocus:neutral-900" rounded-full bg="neutral-0 hocus:neutral-50" size-40 cursor-pointer shadow transition-colors disabled:op-50 :disabled="isLocating" @click="handleLocateMe">
      <Icon :name="isLocating ? 'i-nimiq:loading' : 'i-tabler:current-location'" text-neutral size-20 />
    </button>
  </div>
</template>

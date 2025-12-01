<script setup lang="ts">
const { zoomIn, zoomOut, flyTo, bearing, isRotated, resetNorth } = useMapControls()
const { hasPointer } = usePointerType()
const { isLocating, locateMe, gpsPoint, showUserLocation } = useUserLocation()

function handleLocateMe() {
  locateMe()
  watchOnce(gpsPoint, (point) => {
    if (point)
      flyTo(point)
  })
}
</script>

<template>
  <div flex="~ col gap-8" bottom="12 md:16" right="12 md:16" absolute z-10>
    <Motion
      is="button"
      v-if="isRotated"
      flex="~ items-center justify-center"
      outline="~ 1.5 neutral-200 hocus:neutral-300"
      rounded-full
      bg="neutral-0 hocus:neutral-50"
      size-40
      cursor-pointer
      shadow
      transition-colors
      :initial="{ opacity: 0, scale: 0.3, filter: 'blur(10px)' }"
      :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }"
      :exit="{ opacity: 0, scale: 0.3, filter: 'blur(10px)' }"
      :transition="{ type: 'spring', stiffness: 400, damping: 25 }"
      @click="resetNorth"
    >
      <div
        flex="~ items-center justify-center"
        :style="{ transform: `rotate(${-bearing}deg)`, transition: 'transform 0.05s linear' }"
      >
        <Icon name="i-tabler:navigation" text-neutral size-18 />
      </div>
    </Motion>
    <template v-if="hasPointer">
      <button stack outline="~ 1.5 neutral-200 hocus:neutral-300" rounded-full bg="neutral-0 hocus:neutral-50" size-40 cursor-pointer shadow transition-colors @click="zoomIn">
        <Icon name="i-tabler:plus" text-neutral size-20 />
      </button>
      <button stack outline="~ 1.5 neutral-200 hocus:neutral-300" rounded-full bg="neutral-0 hocus:neutral-50" size-40 cursor-pointer shadow transition-colors @click="zoomOut">
        <Icon name="i-tabler:minus" text-neutral size-20 />
      </button>
    </template>
    <button
      stack
      outline="~ 1.5 neutral-200 hocus:neutral-300"
      rounded-full
      size-40
      cursor-pointer
      shadow
      transition-colors
      disabled:op-50
      bg="neutral-0 hocus:neutral-50"
      :disabled="isLocating"
      @click="handleLocateMe"
    >
      <Icon
        :name="isLocating ? 'i-nimiq:spinner' : 'i-tabler:current-location'"
        size-20
        :class="showUserLocation ? 'text-blue' : 'text-neutral'"
      />
    </button>
  </div>
</template>

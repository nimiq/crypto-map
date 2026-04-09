<script setup lang="ts">
import type { SearchBarPosition } from '../utils/search-bar-position'
import {
  SEARCH_BAR_BOTTOM_UI_OFFSET_MD_PX,
  SEARCH_BAR_BOTTOM_UI_OFFSET_PX,
} from '../utils/search-bar-position'

const props = withDefaults(defineProps<{
  searchBarPosition?: SearchBarPosition
}>(), {
  searchBarPosition: 'top',
})

const { zoomIn, zoomOut, flyTo, bearing, isRotated, resetNorth } = useMapControls()
const { hasPointer } = usePointerType()
const { isLocating, locateMe, gpsPoint, gpsAccuracy, showUserLocation } = useUserLocation()
const { width: windowWidth } = useWindowSize()
const bottomOffsetStyle = computed(() => {
  const bottomOffset = props.searchBarPosition === 'bottom'
    ? (windowWidth.value >= 768 ? SEARCH_BAR_BOTTOM_UI_OFFSET_MD_PX : SEARCH_BAR_BOTTOM_UI_OFFSET_PX)
    : (windowWidth.value >= 768 ? 16 : 12)

  return {
    bottom: props.searchBarPosition === 'bottom'
      ? `calc(${bottomOffset}px + env(safe-area-inset-bottom))`
      : `${bottomOffset}px`,
  }
})

function handleLocateMe() {
  locateMe()
  watchOnce(gpsPoint, (point) => {
    if (point)
      flyTo(point, { accuracyMeters: gpsAccuracy.value ?? undefined })
  })
}
</script>

<template>
  <div flex="~ col gap-8" right="12 md:16" absolute z-10 :style="bottomOffsetStyle">
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

<script setup lang="ts">
const { zoom, center, mapInstance } = useMapControls()

const mapZoom = ref(0)
const mapCenter = ref({ lat: 0, lng: 0 })

// Update debug info when map moves
watch(mapInstance, (map) => {
  if (!map)
    return

  const updateDebugInfo = () => {
    mapZoom.value = map.getZoom()
    const center = map.getCenter()
    mapCenter.value = { lat: center.lat, lng: center.lng }
  }

  // Initial update
  updateDebugInfo()

  // Update on move
  map.on('move', updateDebugInfo)
})
</script>

<template>
  <div

    outline="1.5 offset--1.5 neutral/15"
    text="neutral-700 f-sm"
    font-mono bg-white shadow bottom-16 left-16 absolute z-10 f-px-sm f-py-2xs f-rounded-lg
  >
    <div text="f-xs neutral-600" font-bold font-sans mb-2>
      MAP DEBUG
    </div>
    <div flex="~ col gap-1">
      <div flex="~ gap-2 items-center">
        <span text-neutral-600>Zoom:</span>
        <span font-bold>{{ mapZoom.toFixed(2) }}</span>
      </div>
      <div flex="~ gap-2 items-center">
        <span text-neutral-600>Lat:</span>
        <span font-bold>{{ mapCenter.lat.toFixed(4) }}</span>
      </div>
      <div flex="~ gap-2 items-center">
        <span text-neutral-600>Lng:</span>
        <span font-bold>{{ mapCenter.lng.toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>

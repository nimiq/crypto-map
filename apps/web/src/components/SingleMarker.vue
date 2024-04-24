<script setup lang="ts">
import { Location } from 'types';

defineProps<{ location: Location }>()
const { selectedUuid } = storeToRefs(useLocations())
const { fillMarker, showLocationName } = storeToRefs(useMap())
</script>

<template>
  <div flex="~ items-center gap-8" max-w-176 group :data-active="location.uuid === selectedUuid || undefined"
    @click="selectedUuid = location.uuid">

    <!-- Markers when the user zooms out -->
    <div v-if="!fillMarker" class="marker" text-12 size-12 />

    <!-- Markers for ATMs -->
    <div v-else-if="location.isAtm" size-32 grid="~ place-content-center" ring="1.5 $c1 op-10" bg="$c1 hocus:$c2"
      transition-colors rounded-full :style="{ '--c1': location.bg[0], '--c2': location.bg[1] }">
      {{ $t('ATM') }}
    </div>

    <!-- Markers when the user zooms in and it is not an ATM -->
    <div v-else class="marker" size-32 p-6 text-20>
      <div :class="getCategoryIcon(location.category)" />
    </div>

    <!-- Text -->
    <span v-if="!location.isAtm && showLocationName" flex-1 class="text" relative transition-color
      :data-outline="location.name">
      {{ location.name }}
    </span>
  </div>
</template>

<style scoped>
.marker {
  --uno: ring-1.5 ring-neutral/10 group-data-[active]:ring-blue/6 group-hocus:ring-blue/6;
  --uno: bg-neutral group-data-[active]:bg-blue group-hocus:bg-blue-1100;
  --uno: transition-colors rounded-full shadow text-neutral-0;
}

.text {
  --uno: text-16 text-left text-neutral group-data-[active]:text-blue group-hocus:text-blue-1100 font-bold lh-none select-none;
}
</style>
<script setup lang="ts">
import { createReusableTemplate, useBreakpoints } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { screens } from 'tailwindcss-nimiq-theme'
import type { Location } from 'types'
import type { PropType } from 'vue'
import { computed, defineAsyncComponent, ref } from 'vue'
import { CustomMarker } from 'vue3-google-map'
import { Popover } from 'radix-vue/namespaced'
import { useMap } from '@/stores/map'
import { useLocations } from '@/stores/locations'
import { useApp } from '@/stores/app'
import LocationCard from '@/components/cards/location/LocationCard.vue'

// TODO Async components loading does not work
// const { PopoverArrow, PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } = defineAsyncComponent(() => import('radix-vue'))

defineProps({
  singles: {
    type: Object as PropType<Location[]>,
    required: true,
  },
})
const { zoom } = storeToRefs(useMap())
const { isListShown } = storeToRefs(useApp())

const showSingleName = computed(() => zoom.value >= 11)
const showCategoryIcon = computed(() => zoom.value >= 13)

const CategoryIcon = defineAsyncComponent(
  () => import('@/components/icons/categories/CategoryIcon.vue'),
)

// Since the Desktop requires a Popover, we need to create a reusable template where the trigger is the same component
// as in the mobile version, but without the Popover
const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{ location: Location }>()

const { smaller } = useBreakpoints(screens)
const DESKTOP_LAYOUT = 'md' // FIXME This is suppose to be the same value as in the tailwind config
const isMobile = smaller(DESKTOP_LAYOUT)

const { selectedUuid } = storeToRefs(useLocations())

// Needed when bg color is a gradient
function extractColorFromBg(bg: string) {
  const regex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/g
  // TODO: Find a way to know if the arrow is on the left or right side and use the correct color
  const colors = bg.match(regex) || []
  return colors[colors.length - 1]
}

const popoverKey = ref(0)
function handlePopoverOpen(isOpen: boolean, location: Location) {
  if (!isOpen) {
    selectedUuid.value = undefined
    return
  }
  // Find element by uuid and scroll to it
  const element = document.querySelector(`[data-trigger-uuid="${location.uuid}"]`)
  // Get distance from marker to left side of the screen
  const distance = element?.getBoundingClientRect().left
  // If < 368px (width of the locations list), move the map to the marker
  if (distance && distance < 368 && isListShown.value) {
    popoverKey.value = 0
    useMap().setPosition({
      center: { lat: location.lat, lng: location.lng },
      zoom: zoom.value,
    }, { smooth: true })
    const stop = setInterval(() => {
      popoverKey.value += 1
      if (popoverKey.value === 50)
        clearInterval(stop)
    }, 10)
  }
  selectedUuid.value = location.uuid
}
</script>

<template>
  <DefineTemplate v-slot="{ location: { category, name, isAtm, bg, uuid } }">
    <div class="flex items-center gap-x-2 max-w-[176px] group/marker">
      <div
        v-if="isAtm"
        class="grid w-8 h-8 text-white rounded-full shadow ring-white/40 ring-2 place-content-center bg-[--bg-1] hocus:bg-[--bg-2] transition-colors max-desktop:clickable"
        :style="{ '--bg-1': bg[0], '--bg-2': bg[1] }"
      >
        {{ $t('ATM') }}
      </div>
      <div
        v-else-if="showCategoryIcon"
        class="grid w-8 h-8 text-white transition-colors rounded-full shadow ring-white/40 ring-2 place-content-center max-desktop:clickable"
        :class="uuid === selectedUuid ? 'bg-sky' : 'bg-space group-hover/marker:bg-[#494d6c] group-focus/marker:bg-[#494d6c]'"
      >
        <CategoryIcon :category="category" class="w-7" />
      </div>
      <div
        v-else
        class="grid w-3 h-3 text-sm font-bold text-white transition-colors rounded-full shadow ring-white/40 ring-2 place-content-center clickable"
        :class="uuid === selectedUuid ? 'bg-sky' : 'bg-space group-hover/marker:bg-[#494d6c] group-focus/marker:bg-[#494d6c]'"
      />
      <!-- <PopoverAnchor class="mx-1" /> -->
      <span
        v-if="!isAtm && showSingleName"
        class="flex-1 text-base font-semibold leading-none text-left transition-[color,-webkit-text-stroke] select-none [-webkit-text-stroke:_3px_white] relative before:content-[attr(data-outline)] before:absolute before:[-webkit-text-stroke:0] max-desktop:clickable"
        :class="[uuid === selectedUuid ? 'text-sky' : 'text-space group-hover/marker:text-space/80 group-focus/marker:bg-[#35395A]', { invisible: !isMobile && uuid === selectedUuid }]"
        :data-outline="name"
      >
        {{ name }}
      </span>
    </div>
  </DefineTemplate>

  <CustomMarker
    v-for="location in singles" :key="location.uuid"
    :options="{ position: { lng: location.lng, lat: location.lat }, anchorPoint: showSingleName ? 'LEFT_CENTER' : 'CENTER' }"
    data-custom-marker
  >
    <ReuseTemplate v-if="isMobile" :location="location" @click="selectedUuid = location.uuid" />

    <Popover.Root v-else @update:open="(isOpen: boolean) => handlePopoverOpen(isOpen, location)">
      <Popover.Anchor
        class="absolute h-full pointer-events-none -left-1"
        :class="location.isAtm || showCategoryIcon ? 'w-10' : 'w-5'"
      />
      <Popover.Trigger :aria-label="$t('See location details')" class="cursor-pointer" :data-trigger-uuid="location.uuid">
        <ReuseTemplate :location="location" class="transition-shadow rounded-sm" />
      </Popover.Trigger>
      <Popover.Portal :key="popoverKey">
        <Popover.Content
          side="right" :side-offset="5" class="rounded-lg shadow" :collision-padding="8" sticky="always"
          @open-auto-focus.prevent
        >
          <LocationCard :location="location" :progress="1" :class="location.photo ? 'max-w-xs' : 'max-w-sm'" />
          <Popover.Arrow
            class="w-4 h-2"
            :style="`fill: ${location.isAtm ? extractColorFromBg(location.bg[0]) : 'white'}`"
          />

          <!-- TODO Once this is fixed https://github.com/radix-vue/radix-vue/issues/353 use custom arrow -->
          <!-- <PopoverArrow as-child>
            <svg
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 10" class="relative h-3 w-max left-2"
              :style="`fill: ${location.isAtm ? extractColorFromBg(location.bg[0]) : 'white'}`"
            >
              <path
                fill="currentColor"
                d="M12.63 1.83 8.27 8.25A4 4 0 0 1 4.97 10h17.8a4 4 0 0 1-3.3-1.75L15.1 1.83a1.5 1.5 0 0 0-2.48 0z"
              />
            </svg>
          </PopoverArrow> -->
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  </CustomMarker>

  <template v-if="zoom > 15">
    <CustomMarker
      v-for="({ position, e }) in [{ position: { lat: 10.455694, lng: -84.676981 }, e: '🦥' }, { position: { lat: 19.260062, lng: 98.904358 }, e: '🐘' }, { position: { lng: -73.528486, lat: 45.503334 }, e: '🦫' }]"
      :key="e" :options="{ position, anchorPoint: 'CENTER' }"
    >
      <div
        class="grid w-12 h-12 p-2 text-4xl bg-white rounded-full shadow aspect-square place-content-center"
        title="1 out of 3"
      >
        {{ e }}
      </div>
    </CustomMarker>
  </template>
</template>

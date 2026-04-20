<script setup lang="ts">
import { DrawerContent, DrawerHandle, DrawerPortal, DrawerRoot } from 'vaul-vue'
import { LOCATION_DRAWER_EXPANDED_HEIGHT_CSS } from '~/utils/location-drawer'

const props = defineProps<{
  location?: LocationDetailResponse | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const snap = ref<string | number | null>(LOCATION_DRAWER_COMPACT_SNAP_POINT)
const drawerExpandedHeightCss = LOCATION_DRAWER_EXPANDED_HEIGHT_CSS

watch(() => props.location?.uuid, () => {
  snap.value = LOCATION_DRAWER_COMPACT_SNAP_POINT
})

function collapse() {
  snap.value = LOCATION_DRAWER_COMPACT_SNAP_POINT
}

defineExpose({ collapse })

function handleClose() {
  isOpen.value = false
}
</script>

<template>
  <DrawerRoot
    v-model:open="isOpen"
    v-model:active-snap-point="snap"
    :snap-points="LOCATION_DRAWER_SNAP_POINTS"
    :should-scale-background="false"
    :modal="false"
    handle-only
  >
    <DrawerPortal>
      <DrawerContent
        flex="~ col"
        shadow="[0_-4px_24px_rgba(0,0,0,0.1)]"
        outline-none
        rounded-t-12
        bg-neutral-0
        w-full
        inset-x-0
        bottom-0
        fixed
        z-80
        :style="{
          height: drawerExpandedHeightCss,
          maxHeight: drawerExpandedHeightCss,
        }"
      >
        <!-- Handle and close button - absolutely positioned, overlay content -->
        <div flex="~ items-center justify-center" pt-8 pointer-events-none left-0 right-0 top-0 absolute z-10>
          <DrawerHandle rounded-full bg-neutral-400 h-6 w-40 pointer-events-auto />
          <button bg="neutral-500 hocus:neutral-600" stack rounded-full shrink-0 size-24 pointer-events-auto transition-colors right-12 top-12 absolute @click.stop="handleClose">
            <Icon name="i-nimiq:cross-bold" text-neutral-0 size-10 />
          </button>
        </div>
        <div v-if="props.location" flex-1 min-h-0 of-hidden>
          <LocationDrawerContent
            :key="props.location.uuid"
            v-model:snap="snap"
            :location="props.location"
          />
        </div>
        <div v-else p-8 flex flex-1 justify-center>
          <Icon name="i-nimiq:spinner" text="f-2xl neutral-500" />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style>
/* Override vaul's handle hitarea margins so it stays centered */
[data-vaul-handle-hitarea] {
  margin: 0 !important;
  padding: 8px 16px !important;
}
</style>

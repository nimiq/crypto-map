<script setup lang="ts">
import { DrawerContent, DrawerHandle, DrawerPortal, DrawerRoot } from 'vaul-vue'

const props = defineProps<{
  locationUuid?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:locationUuid', value: string | null): void
}>()

const snapPoints: (string | number)[] = ['450px', 1]
const isOpen = defineModel<boolean>('open', { default: false })
const snap = ref<string | number | null>(snapPoints[0] ?? null)

// Track overlay opacity based on snap point transitions
const overlayOpacity = ref(0)
const showOverlay = ref(false)

watch(snap, async (newSnap, oldSnap) => {
  // Animate overlay when transitioning to/from full screen
  if (newSnap === 1) {
    showOverlay.value = true
    await nextTick()
    overlayOpacity.value = 1
  }
  else if (oldSnap === 1) {
    overlayOpacity.value = 0
    // Wait for transition to complete before hiding
    setTimeout(() => {
      if (snap.value !== 1)
        showOverlay.value = false
    }, 500)
  }
})

// Hide overlay immediately when drawer is dismissed
watch(isOpen, (open) => {
  if (!open) {
    overlayOpacity.value = 0
    showOverlay.value = false
  }
})

// Reset to first snap point when location changes
watch(() => props.locationUuid, () => {
  snap.value = snapPoints[0] ?? null
})

function collapse() {
  snap.value = snapPoints[0] ?? null
}

defineExpose({ collapse })

const locationUrl = computed(() => props.locationUuid ? `/api/locations/${props.locationUuid}` : undefined)

const { data: selectedLocation } = useFetch<LocationDetailResponse>(locationUrl as any, {
  lazy: true,
  watch: [() => props.locationUuid],
  server: false,
})

function handleClose() {
  isOpen.value = false
  emit('update:locationUuid', null)
}
</script>

<template>
  <DrawerRoot v-model:open="isOpen" v-model:active-snap-point="snap" :snap-points :should-scale-background="false" :modal="false" handle-only>
    <DrawerPortal>
      <div
        v-if="showOverlay"
        bg="neutral/20" inset-0 fixed z-70
        :style="{
          opacity: overlayOpacity,
          transition: 'opacity 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }"
        @click="handleClose"
      />
      <DrawerContent flex="~ col" shadow="[0_-4px_24px_rgba(0,0,0,0.1)]" max-h="[calc(100dvh-env(safe-area-inset-top))]" outline-none rounded-t-12 bg-neutral-0 h-full w-full inset-x-0 bottom-0 fixed z-80>
        <!-- Handle and close button - absolutely positioned, overlay content -->
        <div flex="~ items-center justify-center" top-0 left-0 right-0 pt-8 z-10 absolute pointer-events-none>
          <DrawerHandle bg-neutral-400 rounded-full h-6 w-40 pointer-events-auto />
          <button bg="neutral-500 hocus:neutral-600" stack rounded-full shrink-0 size-24 transition-colors top-12 right-12 pointer-events-auto absolute @click.stop="handleClose">
            <Icon name="i-nimiq:cross-bold" text-neutral-0 size-10 />
          </button>
        </div>
        <div v-if="selectedLocation" flex-1 min-h-0 of-hidden>
          <LocationDrawerContent
            :key="selectedLocation.uuid"
            :location="selectedLocation as any"
            :snap
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

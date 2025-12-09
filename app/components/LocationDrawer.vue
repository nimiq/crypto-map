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
  <DrawerRoot v-model:open="isOpen" v-model:active-snap-point="snap" :snap-points :should-scale-background="false" :modal="false">
    <DrawerPortal>
      <div
        v-if="showOverlay"
        bg="neutral/20" inset-0 fixed z-40
        :style="{
          opacity: overlayOpacity,
          transition: 'opacity 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }"
        @click="handleClose"
      />
      <DrawerContent flex="~ col" shadow="[0_-4px_24px_rgba(0,0,0,0.1)]" outline-none rounded-t-10 bg-neutral-0 h-full max-h-95vh inset-x-0 bottom-0 fixed z-50>
        <DrawerHandle my-8 shrink-0 />
        <div v-if="selectedLocation" flex-1 min-h-0 of-hidden>
          <LocationDrawerContent
            :key="selectedLocation.uuid"
            :location="selectedLocation as any"
            :snap
            @close="handleClose"
          />
        </div>
        <div v-else p-8 flex flex-1 justify-center>
          <Icon name="i-nimiq:spinner" text="f-2xl neutral-500" />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

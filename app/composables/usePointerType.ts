export function usePointerType() {
  // Mobile first: assume touch until proven otherwise
  const pointerType = ref<'mouse' | 'touch' | 'pen'>('touch')

  useEventListener('pointerdown', (event: PointerEvent) => {
    pointerType.value = event.pointerType as 'mouse' | 'touch' | 'pen'
  }, { passive: true })

  const hasPointer = computed(() => pointerType.value === 'mouse' || pointerType.value === 'pen')

  return { pointerType, hasPointer }
}

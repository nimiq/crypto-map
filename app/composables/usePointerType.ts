export function usePointerType() {
  const pointerType = ref<'mouse' | 'touch' | 'pen'>('mouse')

  useEventListener('pointerdown', (event: PointerEvent) => {
    pointerType.value = event.pointerType as 'mouse' | 'touch' | 'pen'
  }, { passive: true })

  const hasPointer = computed(() => pointerType.value === 'mouse' || pointerType.value === 'pen')

  return { pointerType, hasPointer }
}

const isSearchPending = shallowRef(false)
const isCountPending = shallowRef(false)
const showDelayedLoading = shallowRef(false)

const isPending = computed(() => isSearchPending.value || isCountPending.value)

let wasPending = false

const { start: startDelayTimer, stop: stopDelayTimer } = useTimeoutFn(() => {
  if (isPending.value)
    showDelayedLoading.value = true
}, 3000, { immediate: false })

function syncDelayTimer() {
  const pending = isPending.value

  if (pending === wasPending)
    return

  wasPending = pending

  if (pending) {
    showDelayedLoading.value = false
    startDelayTimer()
    return
  }

  stopDelayTimer()
  showDelayedLoading.value = false
}

function setSearchPending(value: boolean) {
  isSearchPending.value = value
  syncDelayTimer()
}

function setCountPending(value: boolean) {
  isCountPending.value = value
  syncDelayTimer()
}

export function useLocationLoadingState() {
  return {
    isPending,
    showDelayedLoading,
    setSearchPending,
    setCountPending,
  }
}

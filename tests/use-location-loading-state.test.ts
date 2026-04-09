import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadComposable() {
  vi.resetModules()
  ;(globalThis as any).shallowRef = <T>(value: T) => ({ value })
  ;(globalThis as any).computed = <T>(getter: () => T) => ({
    get value() {
      return getter()
    },
  })
  ;(globalThis as any).useTimeoutFn = (callback: () => void, delay: number) => {
    let timer: ReturnType<typeof setTimeout> | null = null

    return {
      start() {
        if (timer)
          clearTimeout(timer)
        timer = setTimeout(callback, delay)
      },
      stop() {
        if (!timer)
          return
        clearTimeout(timer)
        timer = null
      },
    }
  }

  const mod = await import('../app/composables/useLocationLoadingState')
  return mod.useLocationLoadingState
}

describe('useLocationLoadingState', () => {
  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as any).shallowRef
    delete (globalThis as any).computed
    delete (globalThis as any).useTimeoutFn
  })

  it('keeps delayed loading hidden for requests shorter than 3 seconds', async () => {
    vi.useFakeTimers()

    const useLocationLoadingState = await loadComposable()
    const state = useLocationLoadingState()

    state.setSearchPending(true)
    vi.advanceTimersByTime(2999)

    expect(state.showDelayedLoading.value).toBe(false)
  })

  it('shows delayed loading after 3 seconds of continuous pending work', async () => {
    vi.useFakeTimers()

    const useLocationLoadingState = await loadComposable()
    const state = useLocationLoadingState()

    state.setSearchPending(true)
    vi.advanceTimersByTime(3000)

    expect(state.showDelayedLoading.value).toBe(true)
  })

  it('clears delayed loading immediately once all pending work finishes', async () => {
    vi.useFakeTimers()

    const useLocationLoadingState = await loadComposable()
    const state = useLocationLoadingState()

    state.setSearchPending(true)
    vi.advanceTimersByTime(3000)
    expect(state.showDelayedLoading.value).toBe(true)

    state.setSearchPending(false)

    expect(state.showDelayedLoading.value).toBe(false)
    expect(state.isPending.value).toBe(false)
  })

  it('treats overlapping search and count requests as one pending window', async () => {
    vi.useFakeTimers()

    const useLocationLoadingState = await loadComposable()
    const state = useLocationLoadingState()

    state.setSearchPending(true)
    vi.advanceTimersByTime(2000)

    state.setCountPending(true)
    state.setSearchPending(false)
    vi.advanceTimersByTime(999)

    expect(state.showDelayedLoading.value).toBe(false)

    vi.advanceTimersByTime(1)

    expect(state.showDelayedLoading.value).toBe(true)
    expect(state.isPending.value).toBe(true)
  })
})

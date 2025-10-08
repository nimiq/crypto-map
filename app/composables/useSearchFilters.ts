// URL-based search filters for shareable state
export function useSearchFilters() {
  const params = useUrlSearchParams('history')

  const openNow = computed<boolean>({
    get: () => params.openNow === 'true',
    set: (val) => {
      params.openNow = val || null as any
    },
  })

  const walkable = computed<boolean>({
    get: () => params.walkable === 'true',
    set: (val) => {
      params.walkable = val || null as any
    },
  })

  return {
    openNow,
    walkable,
  }
}

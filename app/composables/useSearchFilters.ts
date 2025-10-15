// URL-based search filters for shareable state
export function useSearchFilters() {
  const params = useUrlSearchParams('history')

  const openNow = computed<boolean>({
    get: () => params.openNow === 'true',
    set: (val) => {
      params.openNow = val ? 'true' : null
    },
  })

  const nearMe = computed<boolean>({
    get: () => params.nearMe === 'true',
    set: (val) => {
      params.nearMe = val ? 'true' : null
    },
  })

  return {
    openNow,
    nearMe,
  }
}

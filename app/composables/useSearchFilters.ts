// URL-based search filters for shareable state
export function useSearchFilters() {
  const params = useUrlSearchParams('history')

  const openNow = computed<boolean>({
    get: () => params.openNow === 'true',
    set: (val) => {
      if (val) {
        params.openNow = 'true'
      }
      else {
        delete params.openNow
      }
    },
  })

  const nearMe = computed<boolean>({
    get: () => params.nearMe === 'true',
    set: (val) => {
      if (val) {
        params.nearMe = 'true'
      }
      else {
        delete params.nearMe
      }
    },
  })

  return {
    openNow,
    nearMe,
  }
}

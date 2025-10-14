interface UseLocationSearchOptions {
  query?: MaybeRefOrGetter<string>
  categories?: MaybeRefOrGetter<string[] | undefined>
  immediate?: boolean
  watch?: boolean
}

// Main location search with filters and geolocation
export function useLocationSearch(options: UseLocationSearchOptions = {}) {
  const { query: customQuery, categories: customCategories, immediate = false, watch = false } = options

  const { openNow, walkable } = useSearchFilters()
  const { coords } = useGeolocation({ immediate: true, enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  const sharedQuery = useState('searchQuery', () => '')

  // Use custom query if provided, otherwise use shared state
  const searchQuery = customQuery !== undefined ? computed(() => toValue(customQuery)) : sharedQuery

  const queryParams = computed(() => ({
    q: searchQuery.value,
    categories: customCategories !== undefined ? toValue(customCategories) : undefined,
    openNow: openNow.value || undefined,
    walkable: walkable.value || undefined,
    lat: coords.value.latitude || undefined,
    lng: coords.value.longitude || undefined,
  }))

  const { data: searchResults, status, refresh: refreshSearch } = useFetch('/api/search', {
    query: queryParams,
    transform: locations => locations.map(loc => ({
      ...loc,
      hoursStatus: getOpeningHoursStatus(loc),
    })),
    immediate,
    watch: watch ? [queryParams] : false,
  })

  return {
    searchQuery,
    searchResults,
    status,
    refreshSearch,
  }
}

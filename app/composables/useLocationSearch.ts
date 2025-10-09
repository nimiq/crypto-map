// Search logic with autocomplete and embedding precomputation
export function useLocationSearch() {
  const { openNow, walkable } = useSearchFilters()
  const { coords } = useGeolocation({ immediate: true, enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })

  const searchQuery = useState('searchQuery', () => '')
  const debouncedSearchQuery = refDebounced(searchQuery, 300, { maxWait: 1000 })

  const { data: searchResults, pending: searchPending, refresh: refreshSearch } = useFetch('/api/search', {
    query: computed(() => ({
      q: searchQuery.value,
      openNow: openNow.value || undefined,
      walkable: walkable.value || undefined,
      lat: coords.value.latitude || undefined,
      lng: coords.value.longitude || undefined,
    })),
    transform: locations => locations.map(loc => ({
      ...loc,
      hoursStatus: getOpeningHoursStatus(loc),
    })),
    immediate: false,
    watch: false,
  })

  const { execute: fetchAutocomplete, data: autocompleteResults } = useFetch(
    '/api/search/autocomplete',
    {
      query: { q: debouncedSearchQuery },
      immediate: false,
      server: false,
      watch: false,
    },
  )

  // Watch debounced query and fetch when valid
  watch(debouncedSearchQuery, (newQuery) => {
    if (newQuery && newQuery.length >= 2) {
      fetchAutocomplete()
    }
  })

  return {
    searchQuery,
    autocompleteResults,
    searchResults,
    searchPending,
    refreshSearch,
  }
}

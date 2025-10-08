// Search logic with autocomplete and embedding precomputation
export function useLocationSearch() {
  const { openNow, walkable } = useSearchFilters()
  const { latitude, longitude } = useGeolocation()

  const searchQuery = useState('searchQuery', () => '')
  const debouncedSearchQuery = refDebounced(searchQuery, 300, { maxWait: 1000 })

  const { data: searchResults, pending: searchPending, refresh: refreshSearch } = useFetch('/api/search', {
    query: computed(() => ({
      q: searchQuery.value,
      openNow: openNow.value || undefined,
      walkable: walkable.value || undefined,
      lat: latitude.value || undefined,
      lng: longitude.value || undefined,
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
    }
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

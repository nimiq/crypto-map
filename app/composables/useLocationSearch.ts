// Search logic with autocomplete and embedding precomputation
export function useLocationSearch() {
  const { openNow } = useSearchFilters()

  const searchQuery = useState('searchQuery', () => '')
  const debouncedSearchQuery = refDebounced(searchQuery, 300, { maxWait: 1000 })

  const { data: searchResults, pending: searchPending, refresh: refreshSearch } = useFetch('/api/search', {
    query: { q: searchQuery, openNow },
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

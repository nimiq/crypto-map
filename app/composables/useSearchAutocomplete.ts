// Autocomplete search with debouncing and embedding precomputation
export function useSearchAutocomplete() {
  const searchQuery = useState('searchQuery', () => '')
  const debouncedSearchQuery = refDebounced(searchQuery, 300, { maxWait: 1000 })

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
  }
}

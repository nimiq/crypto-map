import type { SearchLocationResponse } from '../../shared/types'

// Autocomplete search with debouncing and embedding precomputation
export function useSearchAutocomplete() {
  const searchQuery = useState('searchQuery', () => '')
  const debouncedSearchQuery = refDebounced(searchQuery, 300, { maxWait: 1000 })
  const routeCategory = useRouteQuery<string | undefined>('category', undefined)
  const skipNextFetch = ref(false)

  const { execute: fetchAutocomplete, data: autocompleteResults } = useFetch<SearchLocationResponse[]>(
    '/api/search/autocomplete',
    {
      query: { q: debouncedSearchQuery },
      immediate: false,
      server: false,
      watch: false,
      default: () => [],
    },
  )

  // Watch debounced query and fetch when valid
  watch(debouncedSearchQuery, (newQuery) => {
    const trimmed = newQuery?.trim() ?? ''

    if (skipNextFetch.value) {
      skipNextFetch.value = false
      return
    }

    if (trimmed.length < 2) {
      autocompleteResults.value = []
      return
    }

    if (routeCategory.value && trimmed.toLowerCase() === routeCategory.value.toLowerCase()) {
      return
    }

    fetchAutocomplete()
  })

  const skipNextAutocompleteFetch = () => {
    skipNextFetch.value = true
  }

  return {
    searchQuery,
    autocompleteResults,
    skipNextAutocompleteFetch,
  }
}

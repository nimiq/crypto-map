import type { SearchLocationResponse } from '../../shared/types'

// Autocomplete search with debouncing and embedding precomputation
export function useSearchAutocomplete(
  localInputRef: Ref<string>,
  routeCategory: Ref<string | undefined>,
) {
  const debouncedSearchQuery = refDebounced(localInputRef, 300, { maxWait: 1000 })

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

    if (trimmed.length < 2) {
      autocompleteResults.value = []
      return
    }

    // Don't fetch if the input matches the current category label
    if (routeCategory.value) {
      const categoryLower = routeCategory.value.toLowerCase()
      const queryLower = trimmed.toLowerCase()

      // Check if query matches category ID or formatted label
      if (queryLower === categoryLower || queryLower === categoryLower.replace(/_/g, ' ')) {
        return
      }
    }

    fetchAutocomplete()
  })

  return {
    autocompleteResults,
  }
}

// Search logic with autocomplete and embedding precomputation
export function useLocationSearch() {
  const { openNow } = useSearchFilters()

  const searchQuery = ref('')
  const autocompleteResults = ref<any[]>([])
  const showAutocomplete = ref(false)

  const { data: searchResults, pending: searchPending, refresh: refreshSearch } = useFetch('/api/search', {
    query: {
      q: computed(() => searchQuery.value),
      openNow: computed(() => openNow.value || undefined),
    },
    transform: locations => locations.map(loc => ({
      ...loc,
      hoursStatus: getOpeningHoursStatus(loc),
    })),
    immediate: false,
    watch: false,
  })

  const { execute: fetchAutocomplete } = useFetch('/api/search/autocomplete', {
    query: {
      q: searchQuery,
    },
    immediate: false,
    onResponse({ response }) {
      if (response.ok && response._data) {
        autocompleteResults.value = response._data
        showAutocomplete.value = true
      }
    },
  })

  // Debounce prevents excessive API calls while typing
  watch(searchQuery, useDebounceFn(async (newQuery) => {
    if (newQuery.length < 2) {
      showAutocomplete.value = false
      autocompleteResults.value = []
      return
    }

    // Autocomplete now handles embedding precomputation internally
    await fetchAutocomplete()
  }, 300))

  async function handleSubmit() {
    if (!searchQuery.value || searchQuery.value.length < 2)
      return

    showAutocomplete.value = false
    await refreshSearch()
  }

  async function safeRefreshSearch() {
    if (!searchQuery.value || searchQuery.value.length < 2)
      return
    await refreshSearch()
  }

  return {
    searchQuery,
    autocompleteResults,
    showAutocomplete,
    searchResults,
    searchPending,
    fetchAutocomplete,
    handleSubmit,
    refreshSearch: safeRefreshSearch,
  }
}

import type { LocationResponse } from '@/shared/types'

// Search logic with autocomplete and embedding precomputation
export function useLocationSearch() {
  const { selectedCategories, filters } = useSearchFilters()

  const searchQuery = ref('')
  const autocompleteResults = ref<LocationResponse[]>([])
  const showAutocomplete = ref(false)
  const selectedLocation = ref<LocationResponse | null>(null)

  const transformWithHours = (data: any) => {
    const locations = Array.isArray(data) ? data : data ? [data] : []
    return locations.map(location => ({
      ...location,
      hoursStatus: getOpeningHoursStatus(location.openingHours, location.timezone),
    }))
  }

  const { data: searchResults, pending: searchPending, refresh: refreshSearch } = useFetch('/api/search', {
    query: {
      q: computed(() => searchQuery.value),
      openNow: computed(() => filters.value.includes('open_now') ? 'true' : undefined),
      categories: computed(() => selectedCategories.value.length ? selectedCategories.value.join(',') : undefined),
    },
    transform: transformWithHours,
    immediate: false,
  })

  const { data: locationResult, pending: locationPending, refresh: refreshLocation } = useFetch(() => `/api/locations/${selectedLocation.value?.uuid}`, {
    transform: transformWithHours,
    immediate: false,
  })

  const { execute: fetchAutocomplete } = useFetch('/api/search/autocomplete', {
    query: {
      q: searchQuery,
    },
    immediate: false,
    onResponse({ response }) {
      if (response.ok) {
        autocompleteResults.value = response._data
        showAutocomplete.value = true
      }
    },
  })

  // Speeds up form submission by caching embedding during typing
  async function precomputeEmbedding(query: string) {
    if (query.length < 2)
      return

    // Non-blocking - autocomplete doesn't wait for this
    $fetch('/api/search/embed', {
      method: 'POST',
      body: { q: query },
    }).catch(() => {
      // Silent fail - precomputing is optional optimization
    })
  }

  // Debounce prevents excessive API calls while typing
  watch(searchQuery, useDebounceFn(async (newQuery) => {
    if (newQuery.length < 2) {
      showAutocomplete.value = false
      autocompleteResults.value = []
      return
    }

    await fetchAutocomplete()

    // Background precompute for faster form submission
    precomputeEmbedding(newQuery)
  }, 300))

  async function handleSubmit() {
    if (!searchQuery.value || searchQuery.value.length < 2)
      return

    showAutocomplete.value = false
    selectedLocation.value = null

    await refreshSearch()
  }

  function selectLocation(location: LocationResponse | null) {
    selectedLocation.value = location
    showAutocomplete.value = false

    if (location) {
      searchQuery.value = location.name
      refreshLocation()
    }
    else {
      refreshSearch()
    }
  }

  return {
    searchQuery,
    autocompleteResults,
    showAutocomplete,
    selectedLocation,
    searchResults,
    locationResult,
    searchPending,
    locationPending,
    fetchAutocomplete,
    handleSubmit,
    selectLocation,
  }
}

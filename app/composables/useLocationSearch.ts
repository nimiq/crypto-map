import { watch } from 'vue'

interface UseLocationSearchOptions {
  query?: MaybeRefOrGetter<string>
  categories?: MaybeRefOrGetter<string[] | undefined>
  immediate?: boolean
  shouldWatch?: boolean
  enableInfiniteScroll?: boolean
}

// Main location search with filters and geolocation
export function useLocationSearch(options: UseLocationSearchOptions = {}) {
  const { query: customQuery, categories: customCategories, immediate = false, shouldWatch = false, enableInfiniteScroll = false } = options

  const { openNow, walkable } = useSearchFilters()
  const { lat, lng } = useUserLocation()
  const sharedQuery = useState('searchQuery', () => '')

  // Use custom query if provided, otherwise use shared state
  const searchQuery = customQuery !== undefined ? computed(() => toValue(customQuery)) : sharedQuery

  // Pagination state for infinite scroll
  const currentPage = ref(1)
  const allResults = ref<any[]>([])
  const hasMore = ref(false)
  const total = ref(0)

  const queryParams = computed(() => ({
    q: searchQuery.value,
    categories: customCategories !== undefined ? toValue(customCategories) : undefined,
    openNow: openNow.value || undefined,
    walkable: walkable.value || undefined,
    lat: lat.value || undefined,
    lng: lng.value || undefined,
    page: enableInfiniteScroll ? currentPage.value : undefined,
    limit: enableInfiniteScroll ? 20 : undefined,
  }))

  const { data: apiResponse, status, refresh: refreshSearch } = useFetch('/api/search', {
    query: queryParams,
    immediate,
    watch: shouldWatch ? [queryParams] : false,
  })

  // Process response based on mode
  const searchResults = computed(() => {
    if (!apiResponse.value)
      return []

    const response = apiResponse.value as any

    if (enableInfiniteScroll) {
      // For infinite scroll, use accumulated results
      return allResults.value
    }
    else {
      // For regular mode, transform and return results directly
      const results = response.results || response
      return Array.isArray(results)
        ? results.map((loc: any) => ({ ...loc, hoursStatus: getOpeningHoursStatus(loc) }))
        : []
    }
  })

  // Handle infinite scroll pagination
  watchEffect(() => {
    if (enableInfiniteScroll && apiResponse.value) {
      const response = apiResponse.value as any
      const results = response.results || []

      if (currentPage.value === 1) {
        allResults.value = results.map((loc: any) => ({ ...loc, hoursStatus: getOpeningHoursStatus(loc) }))
      }
      else {
        allResults.value.push(...results.map((loc: any) => ({ ...loc, hoursStatus: getOpeningHoursStatus(loc) })))
      }
      hasMore.value = response.hasMore || false
      total.value = response.total || 0
    }
  })

  // Reset pagination when query changes
  watch(queryParams, () => {
    if (enableInfiniteScroll) {
      currentPage.value = 1
      allResults.value = []
    }
  }, { deep: true })

  const loadMore = async () => {
    if (hasMore.value && status.value !== 'pending') {
      currentPage.value++
      await refreshSearch()
    }
  }

  return {
    searchQuery,
    searchResults,
    status,
    refreshSearch,
    hasMore,
    total,
    loadMore,
  }
}

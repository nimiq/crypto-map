export function useSearch() {
  const query = useState<string>('search-query', () => '')
  const category = useState<string | undefined>(
    'search-category',
    () => undefined,
  )
  const localSearchInput = useState('search-local-input', () => '')
  const openNow = useState<boolean>('filter-open-now', () => false)
  const nearMe = useState<boolean>('filter-near-me', () => false)

  const { lat, lng } = useUserLocation()

  const debouncedSearchQuery = refDebounced(localSearchInput, 300, {
    maxWait: 1000,
  })

  const { execute: fetchAutocomplete, data: autocompleteResults } = useFetch<
    SearchLocationResponse[]
  >('/api/search/autocomplete', {
    query: { q: debouncedSearchQuery },
    immediate: false,
    server: false,
    watch: false,
    default: () => [],
  })

  // Skip autocomplete fetch when input matches current category to avoid unnecessary requests
  watch(debouncedSearchQuery, (newQuery) => {
    const trimmed = newQuery?.trim() ?? ''

    if (trimmed.length < 2) {
      autocompleteResults.value = []
      return
    }

    if (category.value) {
      const categoryLower = category.value.toLowerCase()
      const queryLower = trimmed.toLowerCase()

      if (
        queryLower === categoryLower
        || queryLower === categoryLower.replace(/_/g, ' ')
      ) {
        return
      }
    }

    fetchAutocomplete()
  })

  const hasSearchParams = computed(() => !!query.value || !!category.value)
  const categories = computed(() => {
    if (!category.value)
      return undefined
    // Handle comma-separated categories (from carousel load-more)
    if (category.value.includes(',')) {
      return category.value.split(',').map(c => c.trim())
    }
    return [category.value]
  })

  const currentPage = ref(1)
  const allResults = ref<SearchLocationResponse[]>([])
  const hasMore = ref(false)
  const total = ref(0)

  const queryParams = computed(() => ({
    q:
      typeof query.value === 'string' && query.value.trim().length > 0
        ? query.value
        : undefined,
    categories: categories.value,
    openNow: openNow.value || undefined,
    nearMe: nearMe.value || undefined,
    lat: lat.value ?? undefined,
    lng: lng.value ?? undefined,
    page: currentPage.value,
    limit: 20,
  }))

  const {
    data: apiResponse,
    status,
    refresh: refreshSearch,
  } = useFetch('/api/search', {
    query: queryParams,
    immediate: hasSearchParams.value,
    watch: false,
  })

  const searchResults = computed(() => {
    if (!apiResponse.value)
      return []
    return allResults.value
  })

  // Accumulate results for infinite scroll
  watchEffect(() => {
    if (apiResponse.value) {
      const response = apiResponse.value as any
      const results = response.results || []

      if (currentPage.value === 1) {
        allResults.value = results.map((loc: any) => ({
          ...loc,
          hoursStatus: getOpeningHoursStatus(loc),
        }))
      }
      else {
        allResults.value.push(
          ...results.map((loc: any) => ({
            ...loc,
            hoursStatus: getOpeningHoursStatus(loc),
          })),
        )
      }
      hasMore.value = response.hasMore || false
      total.value = response.total || 0
    }
  })

  watch([query, category, openNow, nearMe, lat, lng], async () => {
    currentPage.value = 1
    allResults.value = []
    if (hasSearchParams.value)
      await refreshSearch()
  })

  async function loadMore() {
    if (hasMore.value && status.value !== 'pending') {
      currentPage.value++
      await refreshSearch()
    }
  }

  const { t } = useI18n()

  function formatCategoryLabel(cat: string) {
    const translationKey = `categories.${cat}`
    const translated = t(translationKey)
    if (translated && translated !== translationKey)
      return translated
    return cat
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  // Keep search input in sync with query/category state
  // Only sync when they're explicitly set, not when empty (to preserve typing)
  watch(
    [query, category],
    () => {
      // Only populate input for single category, not multiple
      if (category.value && !category.value.includes(',')) {
        localSearchInput.value = formatCategoryLabel(category.value)
      }
      else if (query.value) {
        localSearchInput.value = query.value
      }
      else if (category.value?.includes(',')) {
        // Clear input when multiple categories are selected
        localSearchInput.value = ''
      }
    },
  )

  function updateQuery(value: string | undefined) {
    query.value = value || ''
  }

  function updateCategory(value: string | undefined) {
    category.value = value
  }

  function setCategories(cats: string[]) {
    category.value = cats.length > 0 ? cats.join(',') : undefined
  }

  function removeCategory(catId: string) {
    const current = categories.value || []
    const filtered = current.filter(c => c !== catId)
    setCategories(filtered)
  }

  function clearSearch() {
    query.value = ''
    category.value = undefined
    localSearchInput.value = ''
    autocompleteResults.value = []
  }

  return {
    query,
    category,
    categories,
    localSearchInput,
    openNow,
    nearMe,
    autocompleteResults,
    searchResults,
    status,
    hasMore,
    total,
    hasSearchParams,
    loadMore,
    refreshSearch,
    formatCategoryLabel,
    updateQuery,
    updateCategory,
    setCategories,
    removeCategory,
    clearSearch,
  }
}

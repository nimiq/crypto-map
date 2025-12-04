import { consola } from 'consola'

const logger = consola.withTag('search')

export function useSearch() {
  const query = useState<string>('search-query', () => '')
  const category = useState<string | undefined>(
    'search-category',
    () => undefined,
  )
  const localSearchInput = useState('search-local-input', () => '')
  const openNow = useState<boolean>('filter-open-now', () => false)
  const nearMe = useState<boolean>('filter-near-me', () => false)

  const { viewCenter } = useMapControls()

  const debouncedSearchQuery = refDebounced(localSearchInput, 300, {
    maxWait: 1000,
  })

  const autocompleteLocations = ref<SearchLocationResponse[]>([])
  const autocompleteGeo = ref<GeoResult[]>([]) // Strong geo matches (before locations)
  const autocompleteGeoWeak = ref<GeoResult[]>([]) // Weak geo matches (after locations)
  const categorySuggestion = ref<CategorySuggestion | null>(null)
  let abortController: AbortController | null = null
  let suggestionAbortController: AbortController | null = null

  // Skip autocomplete fetch when input matches current category to avoid unnecessary requests
  watch(debouncedSearchQuery, async (newQuery) => {
    const trimmed = newQuery?.trim() ?? ''

    // Cancel previous request if still pending
    if (abortController) {
      abortController.abort()
    }
    if (suggestionAbortController) {
      suggestionAbortController.abort()
    }

    if (trimmed.length < 2) {
      autocompleteLocations.value = []
      autocompleteGeo.value = []
      autocompleteGeoWeak.value = []
      categorySuggestion.value = null
      return
    }

    if (category.value) {
      const categoryLower = category.value.toLowerCase()
      const queryLower = trimmed.toLowerCase()

      if (
        queryLower === categoryLower
        || queryLower === categoryLower.replace(/_/g, ' ')
      ) {
        categorySuggestion.value = null
        return
      }
    }

    abortController = new AbortController()

    try {
      const response = await $fetch<AutocompleteResponse>('/api/search/autocomplete', {
        query: {
          q: trimmed,
          lat: viewCenter.value.lat,
          lng: viewCenter.value.lng,
        },
        signal: abortController.signal,
      })
      autocompleteLocations.value = response.locations
      autocompleteGeo.value = response.geo
      autocompleteGeoWeak.value = response.geoWeak
    }
    catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('Autocomplete fetch failed:', error)
        autocompleteLocations.value = []
        autocompleteGeo.value = []
        autocompleteGeoWeak.value = []
      }
    }

    suggestionAbortController = new AbortController()

    try {
      categorySuggestion.value = await $fetch<CategorySuggestion | null>('/api/search/category-suggestion', {
        query: { q: trimmed },
        signal: suggestionAbortController.signal,
      })
    }
    catch (error: any) {
      if (error.name !== 'AbortError') {
        logger.error('Category suggestion fetch failed:', error)
        categorySuggestion.value = null
      }
    }
  })

  const hasSearchParams = computed(() => !!query.value || !!category.value)
  const categories = computed(() => {
    if (!category.value)
      return undefined
    // Handle comma-separated categories
    if (category.value.includes(',')) {
      return category.value.split(',').map(c => c.trim())
    }
    return [category.value]
  })

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
  watch([query, category], () => {
    logger.info('[useSearch] Query/category changed:', { query: query.value, category: category.value })
    // Only populate input for single category, not multiple
    if (category.value && !category.value.includes(',')) {
      localSearchInput.value = formatCategoryLabel(category.value)
      logger.info('[useSearch] Set input to category label:', localSearchInput.value)
    }
    else if (query.value) {
      localSearchInput.value = query.value
      logger.info('[useSearch] Set input to query:', localSearchInput.value)
    }
    else if (category.value?.includes(',')) {
      // Clear input when multiple categories are selected
      localSearchInput.value = ''
      logger.info('[useSearch] Cleared input (multiple categories)')
    }
  })

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
    autocompleteLocations.value = []
    autocompleteGeo.value = []
    autocompleteGeoWeak.value = []
    categorySuggestion.value = null
  }

  return {
    query,
    category,
    categories,
    localSearchInput,
    openNow,
    nearMe,
    autocompleteLocations,
    autocompleteGeo,
    autocompleteGeoWeak,
    categorySuggestion,
    hasSearchParams,
    formatCategoryLabel,
    updateQuery,
    updateCategory,
    setCategories,
    removeCategory,
    clearSearch,
  }
}

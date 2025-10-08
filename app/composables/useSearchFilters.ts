// URL-based search filters for shareable state
export function useSearchFilters() {
  const params = useUrlSearchParams('history')

  const selectedCategories = computed<string[]>({
    get: () => params.categories ? (params.categories as string).split(',') : [],
    set: (val) => {
      params.categories = val.length ? val.join(',') : null as any
    },
  })

  const filters = computed<string[]>({
    get: () => params.filters ? (params.filters as string).split(',') : [],
    set: (val) => {
      params.filters = val.length ? val.join(',') : null as any
    },
  })

  function removeCategory(categoryId: string) {
    selectedCategories.value = selectedCategories.value.filter(id => id !== categoryId)
  }

  return {
    selectedCategories,
    filters,
    removeCategory,
  }
}

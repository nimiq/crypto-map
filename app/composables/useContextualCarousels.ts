// Contextual carousel data based on time of day and user behavior
export function useContextualCarousels() {
  const { data: contextualPrimaryData } = useFetch('/api/locations?status=contextual-primary&limit=10')
  const contextualPrimaryLocations = computed(() => contextualPrimaryData.value?.locations || [])
  const contextualPrimaryMeta = computed(() => contextualPrimaryData.value?.contextual)

  const { data: contextualSecondaryData } = useFetch('/api/locations?status=contextual-secondary&limit=10')
  const contextualSecondaryLocations = computed(() => contextualSecondaryData.value?.locations || [])
  const contextualSecondaryMeta = computed(() => contextualSecondaryData.value?.contextual)

  return {
    contextualPrimaryLocations,
    contextualPrimaryMeta,
    contextualSecondaryLocations,
    contextualSecondaryMeta,
  }
}

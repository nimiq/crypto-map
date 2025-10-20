// Lugano Conference Center (Plan B Forum at Palazzo dei Congressi)
const LUGANO_LOCATION = { lat: 46.00503, lng: 8.95606 }

export function useUserLocation() {
  const route = useRoute()

  // Toggle state for forcing Lugano location (persisted in localStorage)
  const useLuganoLocation = useLocalStorage('use-lugano-location', true)

  // Read lat/lng from query params (non-reactive, read once)
  const queryLat = route.query.lat ? Number(route.query.lat) : undefined
  const queryLng = route.query.lng ? Number(route.query.lng) : undefined
  const hasQueryParams = queryLat !== undefined && queryLng !== undefined

  // Computed location: URL query params override everything, then localStorage toggle, then default
  const location = computed(() => {
    // Priority 1: URL query params override everything
    if (hasQueryParams) {
      return { lat: queryLat, lng: queryLng }
    }

    // Priority 2: localStorage toggle
    if (useLuganoLocation.value) {
      return LUGANO_LOCATION
    }

    // Priority 3: Default to Lugano
    return LUGANO_LOCATION
  })

  return {
    lat: computed(() => location.value.lat),
    lng: computed(() => location.value.lng),
    useLuganoLocation,
    hasQueryParams,
  }
}

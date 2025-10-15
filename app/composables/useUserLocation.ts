// Lugano Conference Center (Plan B Forum at Palazzo dei Congressi)
const LUGANO_LOCATION = { lat: 46.005030, lng: 8.956060 }

export function useUserLocation() {
  const route = useRoute()

  // Toggle state for forcing Lugano location (persisted in localStorage)
  const useLuganoLocation = useLocalStorage('use-lugano-location', true)

  // Read lat/lng from query params
  const queryLat = computed(() => {
    const lat = route.query.lat
    return lat ? Number(lat) : undefined
  })

  const queryLng = computed(() => {
    const lng = route.query.lng
    return lng ? Number(lng) : undefined
  })

  // Computed location: Lugano if toggle is on, otherwise query params or Lugano default
  const location = computed(() => {
    if (useLuganoLocation.value) {
      return LUGANO_LOCATION
    }

    if (queryLat.value !== undefined && queryLng.value !== undefined) {
      return { lat: queryLat.value, lng: queryLng.value }
    }

    return LUGANO_LOCATION
  })

  return {
    lat: computed(() => location.value.lat),
    lng: computed(() => location.value.lng),
    useLuganoLocation,
    isFromQueryParams: computed(() => queryLat.value !== undefined && queryLng.value !== undefined),
  }
}

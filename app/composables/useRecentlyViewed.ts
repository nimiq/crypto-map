interface RecentlyViewedItem {
  uuid: string
  timestamp: number
}

const MAX_ITEMS = 20
const MAX_AGE_DAYS = 3

export function useRecentlyViewed() {
  const storage = useLocalStorage<RecentlyViewedItem[]>('recentlyViewed', [])

  // Filter out old entries on access
  const recentlyViewed = computed(() => {
    const now = Date.now()
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    const validItems = storage.value.filter(item => now - item.timestamp < maxAge)

    // Update storage if we filtered out items
    if (validItems.length !== storage.value.length)
      storage.value = validItems

    return validItems.map(item => item.uuid)
  })

  // Fetch location data for recently viewed items
  const recentlyViewedUuids = computed(() => recentlyViewed.value.slice(0, 10).join(','))
  const { data: recentlyViewedData } = useFetch(`/api/locations`, {
    query: { uuids: recentlyViewedUuids },
    immediate: !!recentlyViewed.value.length,
  })
  const recentlyViewedLocations = computed(() => recentlyViewedData.value?.locations || [])
  const filteredRecentlyViewed = computed(() => (recentlyViewedLocations.value || []).filter((loc): loc is NonNullable<typeof loc> => loc !== null && loc !== undefined))

  function addRecentlyViewed(uuid: string) {
    let items = [...storage.value]

    // Remove if already exists
    items = items.filter(item => item.uuid !== uuid)

    // Add to beginning
    items.unshift({ uuid, timestamp: Date.now() })

    // Keep only MAX_ITEMS
    items = items.slice(0, MAX_ITEMS)

    storage.value = items
  }

  function clearRecentlyViewed() {
    storage.value = []
  }

  return {
    recentlyViewed,
    recentlyViewedUuids,
    recentlyViewedData,
    recentlyViewedLocations,
    filteredRecentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
  }
}

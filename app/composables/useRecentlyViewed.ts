interface RecentlyViewedItem {
  uuid: string
  timestamp: number
}

const STORAGE_KEY = 'recentlyViewed'
const MAX_ITEMS = 20
const MAX_AGE_DAYS = 30

export function useRecentlyViewed() {
  const recentlyViewed = ref<string[]>([])

  function loadFromStorage() {
    if (!import.meta.client)
      return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored)
        return []

      const items: RecentlyViewedItem[] = JSON.parse(stored)
      const now = Date.now()
      const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

      // Filter out old entries
      const validItems = items.filter(item => now - item.timestamp < maxAge)

      // Save filtered items back
      if (validItems.length !== items.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validItems))
      }

      return validItems.map(item => item.uuid)
    }
    catch (error) {
      console.error('Error loading recently viewed:', error)
      return []
    }
  }

  function addRecentlyViewed(uuid: string) {
    if (!import.meta.client)
      return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      let items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : []

      // Remove if already exists
      items = items.filter(item => item.uuid !== uuid)

      // Add to beginning
      items.unshift({ uuid, timestamp: Date.now() })

      // Keep only MAX_ITEMS
      items = items.slice(0, MAX_ITEMS)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      recentlyViewed.value = items.map(item => item.uuid)
    }
    catch (error) {
      console.error('Error saving recently viewed:', error)
    }
  }

  function clearRecentlyViewed() {
    if (!import.meta.client)
      return

    try {
      localStorage.removeItem(STORAGE_KEY)
      recentlyViewed.value = []
    }
    catch (error) {
      console.error('Error clearing recently viewed:', error)
    }
  }

  onMounted(() => {
    recentlyViewed.value = loadFromStorage()
  })

  return {
    recentlyViewed: readonly(recentlyViewed),
    addRecentlyViewed,
    clearRecentlyViewed,
  }
}

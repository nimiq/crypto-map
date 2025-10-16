interface SearchHistoryItem {
  type: 'query' | 'category'
  value: string
  timestamp: number
}

const MAX_ITEMS = 8

const DEFAULT_CATEGORIES: QuickCategoryItem[] = [
  { category: 'restaurant', label: 'Restaurant', icon: 'i-tabler:tools-kitchen-2', color: 'orange' },
  { category: 'cafe', label: 'Cafe', icon: 'i-tabler:coffee', color: 'gold' },
  { category: 'bar', label: 'Bar', icon: 'i-tabler:beer', color: 'green' },
  { category: 'pharmacy', label: 'Pharmacy', icon: 'i-tabler:pill', color: 'purple' },
]

export function useSearchHistory() {
  const storage = useLocalStorage<SearchHistoryItem[]>('search-history', [])
  const { formatCategoryLabel } = useSearch()

  function addHistoryItem(type: 'query' | 'category', value: string) {
    let items = [...storage.value]
    items = items.filter(item => !(item.type === type && item.value === value))
    items.unshift({ type, value, timestamp: Date.now() })
    items = items.slice(0, MAX_ITEMS)
    storage.value = items
  }

  function getQuickCategories(): QuickCategoryItem[] {
    const historyItems = storage.value.slice(0, 4).map((item): QuickCategoryItem => {
      if (item.type === 'query') {
        return { query: item.value, label: item.value, icon: 'i-tabler:restore', color: 'neutral', isHistory: true }
      }
      else {
        return { category: item.value, label: formatCategoryLabel(item.value), icon: 'i-tabler:restore', color: 'neutral', isHistory: true }
      }
    })

    const remaining = 4 - historyItems.length
    const defaults = DEFAULT_CATEGORIES.slice(0, remaining)
    return [...historyItems, ...defaults]
  }

  function clearHistory() {
    storage.value = []
  }

  return {
    addHistoryItem,
    getQuickCategories,
    clearHistory,
  }
}

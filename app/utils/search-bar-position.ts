export const SEARCH_BAR_QUERY_PARAM = 'searchBarPosition'

export type SearchBarPosition = 'top' | 'bottom'
export type SearchNavigationQuery = Record<string, string | null | Array<string | null> | undefined>

export const SEARCH_BAR_BOTTOM_SAFE_OFFSET_PX = 12
export const SEARCH_BAR_BOTTOM_UI_OFFSET_PX = 88
export const SEARCH_BAR_BOTTOM_UI_OFFSET_MD_PX = SEARCH_BAR_BOTTOM_UI_OFFSET_PX + 4
export const SEARCH_BAR_BOTTOM_COUNTER_OFFSET_PX = SEARCH_BAR_BOTTOM_UI_OFFSET_PX - 4

export function resolveSearchBarPosition(value: string | Array<string | null> | null | undefined): SearchBarPosition {
  if (value === 'top' || value === 'bottom')
    return value

  return 'top'
}

export function getBottomSafeAreaInsetPx() {
  if (typeof document === 'undefined')
    return 0

  const rawValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom-px')
    .trim()
  const safeAreaInset = Number.parseFloat(rawValue)
  return Number.isFinite(safeAreaInset) ? safeAreaInset : 0
}

export function getSearchBarNavigationQuery(
  query: SearchNavigationQuery,
  position: SearchBarPosition,
) {
  const nextQuery = { ...query }

  if (position === 'bottom') {
    nextQuery[SEARCH_BAR_QUERY_PARAM] = 'bottom'
    return nextQuery
  }

  delete nextQuery[SEARCH_BAR_QUERY_PARAM]
  return nextQuery
}

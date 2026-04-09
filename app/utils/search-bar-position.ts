export const SEARCH_BAR_QUERY_PARAM = 'searchBarPosition'

export type SearchBarPosition = 'top' | 'bottom'
export type SearchNavigationQuery = Record<string, string | null | Array<string | null> | undefined>

export const SEARCH_BAR_BOTTOM_UI_OFFSET_PX = 88

export function resolveSearchBarPosition(value: string | Array<string | null> | null | undefined): SearchBarPosition {
  if (value === 'top' || value === 'bottom')
    return value

  return 'top'
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

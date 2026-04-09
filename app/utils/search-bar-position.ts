export const SEARCH_BAR_QUERY_PARAM = 'searchBarPosition'

export type SearchBarPosition = 'top' | 'bottom'

export const SEARCH_BAR_BOTTOM_UI_OFFSET_PX = 88

export function resolveSearchBarPosition(value: string | Array<string | null> | null | undefined): SearchBarPosition {
  if (value === 'top' || value === 'bottom')
    return value

  return 'top'
}

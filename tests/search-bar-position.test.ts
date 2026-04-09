import { describe, expect, it } from 'vitest'

import {
  resolveSearchBarPosition,
  SEARCH_BAR_BOTTOM_UI_OFFSET_PX,
  SEARCH_BAR_QUERY_PARAM,
} from '../app/utils/search-bar-position'

describe('search bar position', () => {
  it('uses the expected query param name', () => {
    expect(SEARCH_BAR_QUERY_PARAM).toBe('searchBarPosition')
  })

  it('defaults to top when the query param is missing', () => {
    expect(resolveSearchBarPosition(undefined)).toBe('top')
  })

  it('defaults to top when the query param is null', () => {
    expect(resolveSearchBarPosition(null)).toBe('top')
  })

  it('accepts the top position', () => {
    expect(resolveSearchBarPosition('top')).toBe('top')
  })

  it('accepts the bottom position', () => {
    expect(resolveSearchBarPosition('bottom')).toBe('bottom')
  })

  it('falls back to top for invalid values', () => {
    expect(resolveSearchBarPosition('left')).toBe('top')
  })

  it('falls back to top for repeated values', () => {
    expect(resolveSearchBarPosition(['bottom', 'top'])).toBe('top')
  })

  it('falls back to top for repeated values that include null', () => {
    expect(resolveSearchBarPosition([null, 'bottom'])).toBe('top')
  })

  it('keeps bottom overlay spacing positive', () => {
    expect(SEARCH_BAR_BOTTOM_UI_OFFSET_PX).toBeGreaterThan(0)
  })
})

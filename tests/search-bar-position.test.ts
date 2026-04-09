import { describe, expect, it } from 'vitest'

import {
  getSearchBarNavigationQuery,
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

  it('preserves the bottom position in navigation query state', () => {
    expect(getSearchBarNavigationQuery({}, 'bottom')).toEqual({
      searchBarPosition: 'bottom',
    })
  })

  it('preserves unrelated query params in navigation query state', () => {
    expect(getSearchBarNavigationQuery({ lang: 'de' }, 'bottom')).toEqual({
      lang: 'de',
      searchBarPosition: 'bottom',
    })
  })

  it('preserves arbitrary scalar query params in navigation query state', () => {
    expect(getSearchBarNavigationQuery({
      lang: 'de',
      ref: 'newsletter',
      page: '2',
      view: 'grid',
    }, 'bottom')).toEqual({
      lang: 'de',
      ref: 'newsletter',
      page: '2',
      view: 'grid',
      searchBarPosition: 'bottom',
    })
  })

  it('preserves repeated and nullable query params in navigation query state', () => {
    expect(getSearchBarNavigationQuery({
      lang: ['de', 'en'],
      tags: ['coffee', null, 'bakery'],
      region: null,
    }, 'bottom')).toEqual({
      lang: ['de', 'en'],
      tags: ['coffee', null, 'bakery'],
      region: null,
      searchBarPosition: 'bottom',
    })
  })

  it('removes only the search bar position query param for top mode', () => {
    expect(getSearchBarNavigationQuery({
      lang: 'de',
      searchBarPosition: 'bottom',
    }, 'top')).toEqual({
      lang: 'de',
    })
  })

  it('does not mutate the incoming query object', () => {
    const query = {
      lang: 'de',
      searchBarPosition: 'bottom',
      tags: ['coffee', 'bakery'],
    }

    const nextQuery = getSearchBarNavigationQuery(query, 'top')

    expect(nextQuery).toEqual({
      lang: 'de',
      tags: ['coffee', 'bakery'],
    })
    expect(query).toEqual({
      lang: 'de',
      searchBarPosition: 'bottom',
      tags: ['coffee', 'bakery'],
    })
  })
})

import { describe, expect, it } from 'vitest'

import {
  LOCATION_DRAWER_COMPACT_HEIGHT_PX,
  LOCATION_DRAWER_COMPACT_SNAP_POINT,
  LOCATION_DRAWER_MAP_BOTTOM_PADDING_PX,
  LOCATION_DRAWER_SNAP_POINTS,
} from '../app/utils/location-drawer'

describe('location drawer config', () => {
  it('uses a single compact snap point shared across the UI', () => {
    expect(LOCATION_DRAWER_COMPACT_HEIGHT_PX).toBe(450)
    expect(LOCATION_DRAWER_COMPACT_SNAP_POINT).toBe('450px')
    expect(LOCATION_DRAWER_SNAP_POINTS).toEqual(['450px'])
  })

  it('keeps map padding aligned with the drawer height', () => {
    expect(LOCATION_DRAWER_MAP_BOTTOM_PADDING_PX).toBe(LOCATION_DRAWER_COMPACT_HEIGHT_PX)
  })
})

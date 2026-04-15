import { describe, expect, it } from 'vitest'

import {
  LOCATION_DRAWER_COMPACT_HEIGHT_PX,
  LOCATION_DRAWER_COMPACT_SNAP_POINT,
  LOCATION_DRAWER_EXPANDED_HEIGHT_CSS,
  LOCATION_DRAWER_EXPANDED_SNAP_POINT,
  LOCATION_DRAWER_SNAP_POINTS,
} from '../app/utils/location-drawer'

describe('location drawer config', () => {
  it('uses compact and capped expanded snap points shared across the UI', () => {
    expect(LOCATION_DRAWER_COMPACT_HEIGHT_PX).toBe(450)
    expect(LOCATION_DRAWER_COMPACT_SNAP_POINT).toBe('450px')
    expect(LOCATION_DRAWER_EXPANDED_SNAP_POINT).toBe(0.96)
    expect(LOCATION_DRAWER_SNAP_POINTS).toEqual(['450px', 0.96])
  })

  it('caps the expanded drawer height below full screen', () => {
    expect(LOCATION_DRAWER_EXPANDED_HEIGHT_CSS).toBe('min(calc(100dvh - env(safe-area-inset-top) - 8px), 96dvh)')
  })
})

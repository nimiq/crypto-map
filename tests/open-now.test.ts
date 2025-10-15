import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterOpenNow } from '../server/utils/open-now'

// Mock location data
const mockLocations = [
  {
    uuid: '1',
    name: 'Coffee House',
    timezone: 'Europe/Zurich',
    openingHours: 'Mo-Fr 08:00-18:00; Sa-Su 09:00-17:00',
  },
  {
    uuid: '2',
    name: 'Night Bar',
    timezone: 'Europe/Zurich',
    openingHours: 'Mo-Su 18:00-02:00',
  },
  {
    uuid: '3',
    name: 'No Hours Location',
    timezone: 'Europe/Zurich',
    openingHours: null,
  },
  {
    uuid: '4',
    name: 'Malformed Hours Location',
    timezone: 'Europe/Zurich',
    openingHours: 'INVALID_FORMAT_!@#$%',
  },
  {
    uuid: '5',
    name: 'Missing Timezone',
    timezone: '',
    openingHours: 'Mo-Fr 08:00-18:00',
  },
]

describe('filterOpenNow', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('should filter out locations without openingHours', () => {
    const result = filterOpenNow([mockLocations[2]])
    expect(result).toHaveLength(0)
  })

  it('should filter out locations without timezone', () => {
    const result = filterOpenNow([mockLocations[4]])
    expect(result).toHaveLength(0)
  })

  it('should handle malformed openingHours gracefully without throwing', () => {
    expect(() => {
      const result = filterOpenNow([mockLocations[3]])
      expect(result).toHaveLength(0)
    }).not.toThrow()
  })

  it('should return open location during business hours', () => {
    try {
      // Tuesday 10:00 UTC = 11:00 Europe/Zurich (within Mo-Fr 08:00-18:00)
      const mockDate = new Date('2025-01-14T10:00:00Z')
      vi.setSystemTime(mockDate)

      const result = filterOpenNow([mockLocations[0]])

      // Coffee House should be open
      expect(result).toHaveLength(1)
      expect(result[0].uuid).toBe('1')
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('should filter out closed location outside business hours', () => {
    try {
      // Tuesday 20:00 UTC = 21:00 Europe/Zurich (outside Mo-Fr 08:00-18:00)
      const mockDate = new Date('2025-01-14T20:00:00Z')
      vi.setSystemTime(mockDate)

      const result = filterOpenNow([mockLocations[0]])

      // Coffee House should be closed
      expect(result).toHaveLength(0)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('should handle mixed valid and invalid data', () => {
    expect(() => {
      const result = filterOpenNow(mockLocations)
      expect(Array.isArray(result)).toBe(true)
    }).not.toThrow()
  })

  it('should handle locations with extra whitespace in openingHours', () => {
    const location = {
      uuid: '6',
      name: 'Whitespace Cafe',
      timezone: 'Europe/Zurich',
      openingHours: '  Mo-Fr 08:00-18:00  ',
    }

    try {
      // Tuesday 10:00 UTC = 11:00 Europe/Zurich
      const mockDate = new Date('2025-01-14T10:00:00Z')
      vi.setSystemTime(mockDate)

      expect(() => {
        const result = filterOpenNow([location])
        expect(result).toHaveLength(1)
      }).not.toThrow()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('should handle multiple malformed entries without stopping', () => {
    const malformedLocations = [
      { uuid: '1', name: 'Bad 1', timezone: 'Europe/Zurich', openingHours: 'INVALID' },
      { uuid: '2', name: 'Bad 2', timezone: 'Europe/Zurich', openingHours: '@@@@' },
      { uuid: '3', name: 'Bad 3', timezone: 'Europe/Zurich', openingHours: '12345' },
    ]

    expect(() => {
      const result = filterOpenNow(malformedLocations)
      expect(result).toHaveLength(0)
    }).not.toThrow()
  })

  it('should handle empty location arrays', () => {
    const result = filterOpenNow([])
    expect(result).toHaveLength(0)
  })
})

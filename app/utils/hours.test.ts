import { describe, expect, it } from 'vitest'
import { formatOpeningHours, getOpeningHoursStatus, getWeeklyHours } from './hours'

describe('getOpeningHoursStatus', () => {
  describe('basic functionality', () => {
    it('should return open status during business hours', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: 'Europe/Zurich' }
      const reference = new Date('2024-01-02T10:00:00Z') // Tuesday 10 AM UTC (11 AM Zurich)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(true)
      expect(result.variant).toBe('open')
      expect(result.messageKey).toBe('hours.open')
    })

    it('should return closed status outside business hours', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: 'Europe/Zurich' }
      const reference = new Date('2024-01-02T20:00:00Z') // Tuesday 8 PM UTC (9 PM Zurich)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(false)
      expect(result.variant).toBe('closed')
      expect(result.messageKey).toBe('hours.closed')
    })

    it('should return closing-soon when less than 1 hour until close', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: 'Europe/Zurich' }
      const reference = new Date('2024-01-02T16:30:00Z') // Tuesday 4:30 PM UTC (5:30 PM Zurich, 30 min to close)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(true)
      expect(result.variant).toBe('closing-soon')
      expect(result.messageKey).toBe('hours.closingSoon')
    })
  })

  describe('edge cases', () => {
    it('should handle 24/7 locations', () => {
      const location = { openingHours: '24/7', timezone: 'Europe/Zurich' }
      const reference = new Date('2024-01-02T03:00:00Z')
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(true)
      expect(result.variant).toBe('open')
    })

    it('should handle overnight hours (bar closing at 5 AM)', () => {
      const location = { openingHours: 'Fr-Sa 22:00-05:00', timezone: 'Europe/Zurich' }
      const reference = new Date('2024-01-06T02:00:00Z') // Saturday 2 AM UTC (3 AM Zurich)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(true)
      expect(result.variant).toBe('open')
    })

    it('should return unavailable when openingHours is missing', () => {
      const location = { openingHours: null, timezone: 'Europe/Zurich' }
      const result = getOpeningHoursStatus(location)
      expect(result.isOpen).toBe(false)
      expect(result.variant).toBe('unavailable')
      expect(result.messageKey).toBe('hours.unavailable')
    })

    it('should return unavailable when timezone is missing', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: null }
      const result = getOpeningHoursStatus(location)
      expect(result.isOpen).toBe(false)
      expect(result.variant).toBe('unavailable')
    })

    it('should return unavailable for invalid opening hours format', () => {
      const location = { openingHours: 'invalid format', timezone: 'Europe/Zurich' }
      const result = getOpeningHoursStatus(location)
      expect(result.isOpen).toBe(false)
      expect(result.variant).toBe('unavailable')
    })

    it('should handle weekend-only hours', () => {
      const location = { openingHours: 'Sa-Su 10:00-22:00', timezone: 'Europe/Zurich' }
      const weekday = new Date('2024-01-02T12:00:00Z') // Tuesday
      const weekend = new Date('2024-01-06T12:00:00Z') // Saturday

      expect(getOpeningHoursStatus(location, weekday).isOpen).toBe(false)
      expect(getOpeningHoursStatus(location, weekend).isOpen).toBe(true)
    })

    it('should handle exactly 1 hour before closing as closing-soon', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: 'Europe/Zurich' }
      const reference = new Date('2024-01-02T16:00:00Z') // Tuesday 4 PM UTC (5 PM Zurich, exactly 1 hour)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(true)
      expect(result.variant).toBe('closing-soon') // <= 1 hour triggers closing-soon
    })
  })

  describe('timezone handling', () => {
    it('should correctly handle different timezones', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: 'America/New_York' }
      const reference = new Date('2024-01-02T14:00:00Z') // Tuesday 2 PM UTC (9 AM NY)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(true)
    })

    it('should handle timezone across date boundary', () => {
      const location = { openingHours: 'Mo-Fr 09:00-18:00', timezone: 'Asia/Tokyo' }
      const reference = new Date('2024-01-01T23:30:00Z') // Monday 11:30 PM UTC (Tuesday 8:30 AM Tokyo)
      const result = getOpeningHoursStatus(location, reference)
      expect(result.isOpen).toBe(false) // Tuesday is open, but 8:30 AM is before 9 AM
    })
  })
})

describe('formatOpeningHours', () => {
  it('should format standard weekday hours', () => {
    const result = formatOpeningHours('Mo-Fr 09:00-18:00')
    expect(result).toContain('Mo-Fr 09:00-18:00')
  })

  it('should format 24/7 hours', () => {
    const result = formatOpeningHours('24/7')
    expect(result).toContain('24/7')
  })

  it('should format complex multi-range hours', () => {
    const result = formatOpeningHours('Mo-Fr 09:00-12:00,14:00-18:00; Sa 10:00-16:00')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle invalid format gracefully', () => {
    const invalid = 'not valid hours'
    const result = formatOpeningHours(invalid)
    expect(result).toEqual([invalid])
  })

  it('should split prettified output by semicolon', () => {
    const result = formatOpeningHours('Mo-Fr 09:00-18:00; Sa-Su 10:00-16:00')
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('getWeeklyHours', () => {
  describe('standard hours', () => {
    it('should return hours for each day of the week', () => {
      const result = getWeeklyHours('Mo-Fr 09:00-18:00')
      expect(result).toHaveLength(7)
      expect(result[0]).toBe('09:00 - 18:00') // Monday
      expect(result[4]).toBe('09:00 - 18:00') // Friday
      expect(result[5]).toBe('') // Saturday (closed)
      expect(result[6]).toBe('') // Sunday (closed)
    })

    it('should handle weekend hours', () => {
      const result = getWeeklyHours('Sa-Su 10:00-22:00')
      expect(result[0]).toBe('') // Monday (closed)
      expect(result[5]).toBe('10:00 - 22:00') // Saturday
      expect(result[6]).toBe('10:00 - 22:00') // Sunday
    })

    it('should handle all days with different hours', () => {
      const result = getWeeklyHours('Mo-Th 09:00-18:00; Fr 09:00-20:00; Sa 10:00-16:00')
      expect(result[0]).toBe('09:00 - 18:00') // Monday
      expect(result[3]).toBe('09:00 - 18:00') // Thursday
      expect(result[4]).toBe('09:00 - 20:00') // Friday
      expect(result[5]).toBe('10:00 - 16:00') // Saturday
      expect(result[6]).toBe('') // Sunday (closed)
    })
  })

  describe('split shifts', () => {
    it('should handle split shifts with lunch break', () => {
      const result = getWeeklyHours('Mo-Fr 09:00-12:00,14:00-18:00')
      expect(result[0]).toBe('09:00 - 12:00, 14:00 - 18:00')
      expect(result[1]).toBe('09:00 - 12:00, 14:00 - 18:00')
    })

    it('should handle multiple split shifts in a day', () => {
      const result = getWeeklyHours('Mo 08:00-10:00,12:00-14:00,16:00-18:00')
      expect(result[0]).toBe('08:00 - 10:00, 12:00 - 14:00, 16:00 - 18:00')
    })
  })

  describe('overnight hours', () => {
    it('should append next day name for overnight hours', () => {
      const result = getWeeklyHours('Fr-Sa 22:00-05:00')
      expect(result[4]).toBe('22:00 - 05:00 Sat') // Friday night to Saturday morning
      expect(result[5]).toBe('22:00 - 05:00 Sun') // Saturday night to Sunday morning
    })

    it('should handle bar hours closing at 3 AM', () => {
      const result = getWeeklyHours('Th-Sa 20:00-03:00')
      expect(result[3]).toBe('20:00 - 03:00 Fri') // Thursday to Friday
      expect(result[4]).toBe('20:00 - 03:00 Sat') // Friday to Saturday
      expect(result[5]).toBe('20:00 - 03:00 Sun') // Saturday to Sunday
    })

    it('should handle Sunday overnight wrapping to Monday', () => {
      const result = getWeeklyHours('Su 22:00-05:00')
      expect(result[6]).toBe('22:00 - 05:00 Mon') // Sunday to Monday
    })

    it('should handle every day overnight hours', () => {
      const result = getWeeklyHours('Mo-Su 18:00-02:00')
      expect(result[0]).toBe('18:00 - 02:00 Tue') // Monday to Tuesday
      expect(result[6]).toBe('18:00 - 02:00 Mon') // Sunday to Monday
    })
  })

  describe('24/7 and special cases', () => {
    it('should handle 24/7 locations', () => {
      const result = getWeeklyHours('24/7')
      result.forEach(day => {
        expect(day).toBe('00:00 - 23:59')
      })
    })

    it('should handle closing at midnight', () => {
      const result = getWeeklyHours('Mo-Fr 09:00-00:00')
      expect(result[0]).toBe('09:00 - 00:00 Tue') // Midnight counts as next day
    })

    it('should return empty array for invalid format', () => {
      const result = getWeeklyHours('invalid format')
      expect(result).toHaveLength(7)
      expect(result.every(day => day === '')).toBe(true)
    })

    it('should handle off days notation', () => {
      const result = getWeeklyHours('Mo-Fr 09:00-18:00; Sa,Su off')
      expect(result).toHaveLength(7)
      // Weekdays should work
      expect(result[0]).toBe('09:00 - 18:00')
      // Weekend should be closed
      expect(result[5]).toBe('')
      expect(result[6]).toBe('')
    })
  })

  describe('edge cases and formatting', () => {
    it('should pad single digit hours with zero', () => {
      const result = getWeeklyHours('Mo-Fr 09:00-18:00')
      expect(result[0]).toBe('09:00 - 18:00')
      expect(result[0]).not.toBe('9:00 - 18:00')
    })

    it('should handle minutes other than :00', () => {
      const result = getWeeklyHours('Mo-Fr 09:30-18:45')
      expect(result[0]).toBe('09:30 - 18:45')
    })

    it('should handle early morning opening (5 AM)', () => {
      const result = getWeeklyHours('Mo-Fr 05:00-13:00')
      expect(result[0]).toBe('05:00 - 13:00')
    })

    it('should handle late night closing (11:59 PM)', () => {
      const result = getWeeklyHours('Mo-Fr 12:00-23:59')
      expect(result[0]).toBe('12:00 - 23:59')
    })

    it('should trim whitespace in input', () => {
      const result = getWeeklyHours('  Mo-Fr 09:00-18:00  ')
      expect(result[0]).toBe('09:00 - 18:00')
    })
  })

  describe('real-world scenarios', () => {
    it('should handle restaurant hours (lunch + dinner)', () => {
      const result = getWeeklyHours('Tu-Su 12:00-14:30,18:00-22:00')
      expect(result[0]).toBe('') // Monday closed
      expect(result[1]).toBe('12:00 - 14:30, 18:00 - 22:00') // Tuesday
      expect(result[6]).toBe('12:00 - 14:30, 18:00 - 22:00') // Sunday
    })

    it('should handle gym hours (early open, late close)', () => {
      const result = getWeeklyHours('Mo-Fr 06:00-23:00; Sa-Su 08:00-20:00')
      expect(result[0]).toBe('06:00 - 23:00') // Monday
      expect(result[5]).toBe('08:00 - 20:00') // Saturday
    })

    it('should handle nightclub hours (weekend only, overnight)', () => {
      const result = getWeeklyHours('Fr-Sa 23:00-06:00')
      expect(result[4]).toBe('23:00 - 06:00 Sat') // Friday night
      expect(result[5]).toBe('23:00 - 06:00 Sun') // Saturday night
    })

    it('should handle bakery hours (very early opening)', () => {
      const result = getWeeklyHours('Mo-Sa 05:30-13:00')
      expect(result[0]).toBe('05:30 - 13:00')
      expect(result[6]).toBe('') // Sunday closed
    })
  })
})

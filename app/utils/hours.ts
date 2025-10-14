import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export interface OpeningHoursStatus {
  isOpen: boolean
  nextChange: Date | null
  variant: 'open' | 'closing-soon' | 'closed' | 'unavailable'
  messageKey: string
}

const variantConfig = {
  'open': 'hours.open',
  'closing-soon': 'hours.closingSoon',
  'closed': 'hours.closed',
  'unavailable': 'hours.unavailable',
} as const

// Calculates opening hours status with visual indicators for UX
export function getOpeningHoursStatus(location: { openingHours?: string | null, timezone?: string | null }, reference: Date = new Date()): OpeningHoursStatus {
  if (!location.openingHours || !location.timezone) return { isOpen: false, nextChange: null, variant: 'unavailable', messageKey: variantConfig.unavailable }

  try {
    const localDate = toZonedTime(reference, location.timezone)
    const schedule = new OpeningHours(location.openingHours.trim())
    const isOpen = schedule.getState(localDate)
    const nextChange = schedule.getNextChange(localDate) || null

    // Visual indicator helps users plan visits better
    let variant: OpeningHoursStatus['variant'] = isOpen ? 'open' : 'closed'
    if (isOpen && nextChange) {
      const timeUntilClose = nextChange.getTime() - localDate.getTime()
      const oneHour = 60 * 60 * 1000
      if (timeUntilClose <= oneHour) variant = 'closing-soon'
    }

    return { isOpen, nextChange, variant, messageKey: variantConfig[variant] }
  } catch {
    return { isOpen: false, nextChange: null, variant: 'unavailable', messageKey: variantConfig.unavailable }
  }
}

// Formats opening hours string into readable lines
export function formatOpeningHours(openingHours: string): string[] {
  try {
    const schedule = new OpeningHours(openingHours.trim())
    return schedule.prettifyValue().split(';').map(line => line.trim()).filter(Boolean)
  } catch {
    return [openingHours]
  }
}

/**
 * Parse OSM opening hours format and return array of formatted hours for each day
 * @param openingHoursString OSM format opening hours string (e.g., "Mo-Fr 09:00-18:00")
 * @returns Array of 7 strings (Mon-Sun) showing when each day opens/closes, or empty string if closed
 */
export function getWeeklyHours(openingHoursString: string): string[] {
  try {
    const oh = new OpeningHours(openingHoursString.trim())
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return Array.from({ length: 7 }, (_, dayIndex) => {
      // Create a date for each day of the week starting from Monday
      // Jan 1, 2024 is a Monday, so we can use it as reference
      const dayStart = new Date(2024, 0, 1 + dayIndex, 0, 0, 0)
      // Query 48 hours to catch overnight periods (e.g., Fr 22:00-Sa 05:00 shows on Friday)
      const queryEnd = new Date(2024, 0, 2 + dayIndex, 23, 59, 59)

      // Get opening intervals for this day + next day
      const intervals = oh.getOpenIntervals(dayStart, queryEnd)

      if (!intervals || intervals.length === 0) return '' // Closed this day

      // Filter intervals that start on the target day, excluding midnight continuations
      const dayIntervals = intervals.filter(([start, end]) => {
        const startsOnTargetDay = start.getDate() === dayStart.getDate()
        const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0
        const endsAt2359 = end.getHours() === 23 && end.getMinutes() === 59

        // Allow midnight starts if they end at 23:59 (full-day operations like 24/7)
        // Otherwise exclude midnight starts as they're continuations from previous day
        if (startsAtMidnight) {
          return startsOnTargetDay && endsAt2359
        }

        return startsOnTargetDay
      })

      if (dayIntervals.length === 0) return ''

      // Format all intervals for this day (handles split shifts like "09:00-12:00, 14:00-18:00")
      return dayIntervals.map(([start, end]) => {
        const startTime = formatTime(start)
        const endTime = formatTime(end)

        // Check if closing time is next day (e.g., opens 22:00 Friday, closes 05:00 Saturday)
        // Exception: 23:59 is treated as end-of-day, not next day
        const isNextDay = end.getDate() !== start.getDate() && !(end.getHours() === 23 && end.getMinutes() === 59)

        if (isNextDay) {
          const nextDayIndex = (dayIndex + 1) % 7
          const nextDayName = dayNames[nextDayIndex]
          return `${startTime} - ${endTime} ${nextDayName}`
        }

        return `${startTime} - ${endTime}`
      }).join(', ')
    })
  } catch {
    // Return empty strings for all days if parsing fails
    return Array(7).fill('')
  }
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

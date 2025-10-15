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
  if (!location.openingHours || !location.timezone)
    return { isOpen: false, nextChange: null, variant: 'unavailable', messageKey: variantConfig.unavailable }

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
      if (timeUntilClose <= oneHour)
        variant = 'closing-soon'
    }

    return { isOpen, nextChange, variant, messageKey: variantConfig[variant] }
  }
  catch {
    return { isOpen: false, nextChange: null, variant: 'unavailable', messageKey: variantConfig.unavailable }
  }
}

// Formats opening hours string into readable lines
export function formatOpeningHours(openingHours: string): string[] {
  try {
    const schedule = new OpeningHours(openingHours.trim())
    return schedule.prettifyValue().split(';').map(line => line.trim()).filter(Boolean)
  }
  catch {
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

      if (!intervals || intervals.length === 0)
        return '' // Closed this day

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

      if (dayIntervals.length === 0)
        return ''

      // Format all intervals for this day (handles split shifts like "09:00-12:00, 14:00-18:00")
      return dayIntervals.map(([start, end]) => {
        const startTime = formatTime(start)
        const endTime = formatTime(end)
        return `${startTime} - ${endTime}`
      }).join(', ')
    })
  }
  catch {
    // Return empty strings for all days if parsing fails
    return Array.from({ length: 7 }, () => '')
  }
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export interface RotatedWeeklyHours {
  hours: string[]
  separatorAfterIndex: number | null
}

/**
 * Determines the first day of the week (0=Sunday, 1=Monday) for a given locale
 */
function getFirstDayOfWeek(locale: string): number {
  // Use Intl.Locale to determine week info (supported in modern browsers)
  try {
    const localeObj = new Intl.Locale(locale)
    // @ts-expect-error - weekInfo is available in newer browsers but not in all TypeScript versions
    const weekInfo = localeObj.weekInfo || localeObj.getWeekInfo?.()
    if (weekInfo?.firstDay) {
      // weekInfo.firstDay is 1-7 where 7=Sunday, 1=Monday
      // Convert to 0-6 where 0=Sunday, 1=Monday
      return weekInfo.firstDay === 7 ? 0 : weekInfo.firstDay
    }
  }
  catch {
    // Fallback intentionally empty
  }

  // Fallback: US/CA/IL/JP use Sunday, most others use Monday
  const sundayFirstLocales = ['en-US', 'en-CA', 'ja-JP', 'he-IL', 'ar-SA']
  return sundayFirstLocales.includes(locale) ? 0 : 1
}

/**
 * Rotates weekly hours array to start from today (in location's timezone)
 * Includes separator index to visually distinguish current week from next week
 * @param weeklyHours Array of 7 hour strings (Mon-Sun)
 * @param timezone IANA timezone identifier (e.g., "Europe/Zurich")
 * @param locale Locale string for determining week start day (e.g., "en-US", "de-CH")
 * @returns Object with rotated hours and separator index (after last day of current week)
 */
export function rotateWeeklyHoursToToday(weeklyHours: string[], timezone: string, locale: string = 'en-US'): RotatedWeeklyHours {
  if (weeklyHours.length !== 7)
    return { hours: weeklyHours, separatorAfterIndex: null }

  const today = toZonedTime(new Date(), timezone)
  // getDay() returns 0-6 where 0 is Sunday
  const dayOfWeek = today.getDay()

  // Convert to Monday-first index (0=Mon, 6=Sun) since our array is Monday-first
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Rotate array: take items from today onwards, then add items before today
  const hours = [...weeklyHours.slice(todayIndex), ...weeklyHours.slice(0, todayIndex)]

  // Determine week boundary based on locale
  const firstDayOfWeek = getFirstDayOfWeek(locale)

  // Calculate the last day of the week based on locale's first day
  // If week starts on Sunday (0), it ends on Saturday (6)
  // If week starts on Monday (1), it ends on Sunday (0)
  const lastDayOfWeek = firstDayOfWeek === 0 ? 6 : 0

  // Convert lastDayOfWeek to Monday-first index for our array
  const lastDayIndex = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1

  // If today is the first day of the week, all 7 days shown are current week
  if (dayOfWeek === firstDayOfWeek)
    return { hours, separatorAfterIndex: null }

  // Calculate separator position: after the last day of current week
  // Find where lastDayIndex appears in the rotated array
  let separatorAfterIndex: number | null = null
  for (let i = 0; i < 7; i++) {
    const originalIndex = (todayIndex + i) % 7
    if (originalIndex === lastDayIndex) {
      separatorAfterIndex = i
      break
    }
  }

  return { hours, separatorAfterIndex }
}

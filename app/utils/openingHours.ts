import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export type OpeningHoursStatus = {
  isOpen: boolean
  nextChange: Date | null
  variant: 'open' | 'closing-soon' | 'closed' | 'unavailable'
}

// Calculates opening hours status with visual indicators for UX
export function getOpeningHoursStatus(
  expression: string | null | undefined,
  timezone: string | null | undefined,
  reference: Date = new Date(),
): OpeningHoursStatus {
  if (!expression || !timezone)
    return { isOpen: false, nextChange: null, variant: 'unavailable' }

  try {
    const localDate = toZonedTime(reference, timezone)
    const schedule = new OpeningHours(expression.trim())

    const isOpen = schedule.getState(localDate)
    const nextChange = schedule.getNextChange(localDate) || null

    // Visual indicator helps users plan visits better
    let variant: OpeningHoursStatus['variant'] = isOpen ? 'open' : 'closed'

    if (isOpen && nextChange) {
      const timeUntilClose = nextChange.getTime() - localDate.getTime()
      const oneHour = 60 * 60 * 1000
      if (timeUntilClose <= oneHour) {
        variant = 'closing-soon'
      }
    }

    return { isOpen, nextChange, variant }
  }
  catch {
    return { isOpen: false, nextChange: null, variant: 'unavailable' }
  }
}

// Get i18n message key for status variant
export function getHoursMessageKey(variant: OpeningHoursStatus['variant']): string {
  const map = {
    'open': 'hours.open',
    'closing-soon': 'hours.closingSoon',
    'closed': 'hours.closed',
    'unavailable': 'hours.unavailable',
  }
  return map[variant]
}

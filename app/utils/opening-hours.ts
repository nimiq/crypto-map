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
export function getOpeningHoursStatus(
  location: { openingHours?: string | null, timezone?: string | null },
  reference: Date = new Date(),
): OpeningHoursStatus {
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
      if (timeUntilClose <= oneHour) {
        variant = 'closing-soon'
      }
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

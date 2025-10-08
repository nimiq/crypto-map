import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export type OpeningHoursStatus = {
  isOpen: boolean
  message: string
  nextChange: Date | null
  variant: 'open' | 'closing-soon' | 'closed' | 'unavailable'
}

// Calculates opening hours status with visual indicators for UX
export function useOpeningHours() {
  function getStatus(
    expression: string | null | undefined,
    timezone: string | null | undefined,
    reference: Date = new Date(),
  ): OpeningHoursStatus {
    if (!expression || !timezone)
      return { isOpen: false, message: 'Hours unavailable', nextChange: null, variant: 'unavailable' }

    try {
      const localDate = toZonedTime(reference, timezone)
      const schedule = new OpeningHours(expression.trim())

      const isOpen = schedule.getState(localDate)
      const nextChange = schedule.getNextChange(localDate) || null

      // Visual indicator helps users plan visits better
      let variant: OpeningHoursStatus['variant'] = isOpen ? 'open' : 'closed'
      let message = isOpen ? 'Open now' : 'Closed'

      if (isOpen && nextChange) {
        const timeUntilClose = nextChange.getTime() - localDate.getTime()
        const oneHour = 60 * 60 * 1000
        if (timeUntilClose <= oneHour) {
          variant = 'closing-soon'
          message = 'Closing soon'
        }
      }

      return { isOpen, message, nextChange, variant }
    }
    catch {
      return { isOpen: false, message: 'Hours unavailable', nextChange: null, variant: 'unavailable' }
    }
  }

  return { getStatus }
}

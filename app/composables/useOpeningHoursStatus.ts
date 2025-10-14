import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export type OpeningHoursVariant = 'success' | 'warning' | 'neutral'

export interface OpeningHoursDisplayStatus {
  label: string
  variant: OpeningHoursVariant
}

// Calculate opening hours status for a location
export function useOpeningHoursStatus(openingHours: MaybeRefOrGetter<string>, timezone: MaybeRefOrGetter<string>) {
  const status = computed<OpeningHoursDisplayStatus>(() => {
    try {
      const hours = toValue(openingHours)
      const tz = toValue(timezone)
      const localDate = toZonedTime(new Date(), tz)
      const oh = new OpeningHours(hours.trim())
      const isOpen = oh.getState(localDate)

      if (isOpen) {
        const nextChange = oh.getNextChange(localDate)
        if (nextChange) {
          const minutesUntilClose = Math.floor((nextChange.getTime() - localDate.getTime()) / 1000 / 60)
          if (minutesUntilClose <= 60) {
            return { label: 'Closes soon', variant: 'warning' }
          }
        }
        return { label: 'Open now', variant: 'success' }
      }

      return { label: 'Closed', variant: 'neutral' }
    }
    catch {
      return { label: 'Unknown', variant: 'neutral' }
    }
  })

  const formattedHours = computed(() => {
    try {
      const hours = toValue(openingHours)
      const oh = new OpeningHours(hours.trim())
      return oh.prettifyValue().split(';').map(line => line.trim()).filter(Boolean)
    }
    catch {
      return [toValue(openingHours)]
    }
  })

  return {
    status,
    formattedHours,
  }
}

import { format, isSameWeek, isTomorrow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export type OpeningHoursVariant = 'success' | 'warning' | 'neutral'

export interface OpeningHoursDisplayStatus {
  label: string
  variant: OpeningHoursVariant
  nextOpening?: {
    time: string
    dayKey?: string
    isTomorrow: boolean
  }
}

// Calculate opening hours status for a location
export function useOpeningHoursStatus(openingHours: MaybeRefOrGetter<string>, timezone: MaybeRefOrGetter<string>) {
  const { t } = useI18n()

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
            // Closing soon - calculate when it opens next
            const closeTime = toZonedTime(nextChange, tz)
            const nextOpening = oh.getNextChange(closeTime)

            if (nextOpening) {
              const nextOpeningLocal = toZonedTime(nextOpening, tz)
              const openingTime = format(nextOpeningLocal, 'HH:mm')

              if (isTomorrow(nextOpeningLocal)) {
                return {
                  label: t('hours.closingSoonOpensAt', { time: openingTime, day: t('hours.tomorrow') }),
                  variant: 'warning',
                  nextOpening: { time: openingTime, isTomorrow: true },
                }
              }
              else if (isSameWeek(nextOpeningLocal, localDate)) {
                const dayKey = format(nextOpeningLocal, 'EEEE').toLowerCase()
                return {
                  label: t('hours.closingSoonOpensAt', { time: openingTime, day: t(`days.${dayKey}`) }),
                  variant: 'warning',
                  nextOpening: { time: openingTime, dayKey, isTomorrow: false },
                }
              }
            }

            return { label: t('hours.closingSoon'), variant: 'warning' }
          }
        }
        return { label: t('hours.open'), variant: 'success' }
      }

      // Closed - calculate next opening
      const nextChange = oh.getNextChange(localDate)
      if (nextChange) {
        const nextOpening = toZonedTime(nextChange, tz)
        const openingTime = format(nextOpening, 'HH:mm')

        if (isTomorrow(nextOpening)) {
          return {
            label: t('hours.opensAt', { time: openingTime, day: t('hours.tomorrow') }),
            variant: 'neutral',
            nextOpening: { time: openingTime, isTomorrow: true },
          }
        }
        else if (isSameWeek(nextOpening, localDate)) {
          const dayKey = format(nextOpening, 'EEEE').toLowerCase()
          return {
            label: t('hours.opensAt', { time: openingTime, day: t(`days.${dayKey}`) }),
            variant: 'neutral',
            nextOpening: { time: openingTime, dayKey, isTomorrow: false },
          }
        }
        else {
          // More than a week away - just show "Closed"
          return { label: t('hours.closed'), variant: 'neutral' }
        }
      }

      return { label: t('hours.closed'), variant: 'neutral' }
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

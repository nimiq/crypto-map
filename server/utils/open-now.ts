import type { LocationResponse } from '../../shared/types'
import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export function filterOpenNow<T extends LocationResponse>(locations: T[]): T[] {
  const referenceTime = new Date()

  return locations.filter(({ openingHours, timezone }) => {
    if (!openingHours || !timezone)
      return false
    const localDate = toZonedTime(referenceTime, timezone)
    const schedule = new OpeningHours(openingHours.trim())
    return schedule.getState(localDate)
  })
}

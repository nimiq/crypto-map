import { consola } from 'consola'
import { toZonedTime } from 'date-fns-tz'
import OpeningHours from 'opening_hours'

export function filterOpenNow<T extends { openingHours: string | null, timezone: string, uuid?: string, name?: string }>(locations: T[]): T[] {
  const referenceTime = new Date()

  return locations.filter((location) => {
    const { openingHours, timezone, uuid, name } = location
    if (!openingHours || !timezone)
      return false

    try {
      const localDate = toZonedTime(referenceTime, timezone)
      const schedule = new OpeningHours(openingHours.trim())
      return schedule.getState(localDate)
    }
    catch (error) {
      // Don't throw to prevent bad data from causing 500s for entire request
      consola.warn('Failed to parse openingHours', {
        tag: 'open-now-filter',
        uuid,
        name,
        timezone,
        openingHours: openingHours.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  })
}

// Enriches location data with computed opening hours status
export function enrichLocationWithHours<T extends { openingHours: string | null, timezone: string | null }>(location: T) {
  return {
    ...location,
    hoursStatus: getOpeningHoursStatus(location.openingHours, location.timezone),
  }
}

// Enriches array of locations with computed opening hours status
export function enrichLocationsWithHours<T extends { openingHours: string | null, timezone: string | null }>(locations: T[]) {
  return locations.map(enrichLocationWithHours)
}

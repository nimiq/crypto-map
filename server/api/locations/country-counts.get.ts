import { sql } from 'drizzle-orm'

// Country hotspots with radius in km for circle-based counting
const COUNTRIES = [
  { code: 'SV', center: { lat: 13.8, lng: -88.9 }, radiusKm: 150 }, // El Salvador ~150km covers the country
  { code: 'CH', center: { lat: 46.8, lng: 8.2 }, radiusKm: 200 }, // Switzerland ~200km covers the country
] as const

export default defineEventHandler(async () => {
  const counts: Record<string, number> = {}

  for (const country of COUNTRIES) {
    const result = await useDrizzle()
      .select({ count: sql<number>`count(*)` })
      .from(tables.locations)
      .where(sql`ST_DWithin(
        ${tables.locations.location}::geography,
        ST_SetSRID(ST_MakePoint(${country.center.lng}, ${country.center.lat}), 4326)::geography,
        ${country.radiusKm * 1000}
      )`)

    counts[country.code] = Number(result[0]?.count || 0)
  }

  return counts
})

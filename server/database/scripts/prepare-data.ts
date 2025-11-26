import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('prepare-data')

interface GoogleMapsLocation {
  id: string
  types: string[]
  formattedAddress: string
  location: { latitude: number, longitude: number }
  rating?: number
  userRatingCount?: number
  googleMapsUri: string
  websiteUri?: string
  utcOffsetMinutes: number
  displayName: { text: string, languageCode: string }
  currentOpeningHours?: {
    openNow: boolean
    periods: Array<{
      open: { day: number, hour: number, minute: number }
      close?: { day: number, hour: number, minute: number }
    }>
    weekdayDescriptions?: string[]
  }
  photos?: Array<{ name: string }>
}

interface GoogleMapsData {
  metadata: {
    downloaded_at: string
    center: { lat: number, lng: number }
    radius_km: number
    total_locations: number
  }
  locations: GoogleMapsLocation[]
}

function parseAddress(formattedAddress: string): { street: string, city: string, postalCode: string, region: string | null, country: string } {
  const parts = formattedAddress.split(',').map(p => p.trim())

  if (parts.length < 3) {
    consola.warn(`Unexpected address format: ${formattedAddress}`)
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      postalCode: '',
      region: null,
      country: parts[parts.length - 1] || 'Switzerland',
    }
  }

  const street = parts[0]
  const country = parts[parts.length - 1]
  const middlePart = parts[1]
  const postalCodeMatch = middlePart.match(/^(\d{4,5})\s+(\S.*)$/)

  if (postalCodeMatch) {
    return {
      street,
      city: postalCodeMatch[2],
      postalCode: postalCodeMatch[1],
      region: null,
      country,
    }
  }

  return {
    street,
    city: middlePart,
    postalCode: '',
    region: null,
    country,
  }
}

function convertOpeningHours(currentOpeningHours?: GoogleMapsLocation['currentOpeningHours']): string | null {
  if (!currentOpeningHours?.weekdayDescriptions)
    return null

  try {
    return currentOpeningHours.weekdayDescriptions.join('; ')
  }
  catch {
    return null
  }
}

function getTimezone(): string {
  return 'Europe/Zurich'
}

function filterCategories(types: string[]): string[] {
  const excludedTypes = new Set([
    'point_of_interest',
    'establishment',
    'food',
    'health',
    'finance',
    'place_of_worship',
  ])

  return types.filter(type => !excludedTypes.has(type))
}

function escapeSql(value: string | null | undefined): string {
  if (value === null || value === undefined)
    return 'NULL'
  return `'${value.replace(/'/g, '\'\'')}'`
}

function formatLocationRow(loc: GoogleMapsLocation): string {
  const addr = parseAddress(loc.formattedAddress)
  const openingHours = convertOpeningHours(loc.currentOpeningHours)
  const timezone = getTimezone()
  const photo = 'NULL'

  const values = [
    escapeSql(loc.displayName.text),
    escapeSql(addr.street),
    escapeSql(addr.city),
    escapeSql(addr.postalCode),
    addr.region ? escapeSql(addr.region) : 'NULL',
    escapeSql(addr.country),
    loc.location.longitude,
    loc.location.latitude,
    loc.rating !== undefined ? loc.rating : 'NULL::double precision',
    loc.userRatingCount !== undefined ? loc.userRatingCount : 'NULL::double precision',
    photo,
    escapeSql(loc.id),
    escapeSql(loc.googleMapsUri),
    loc.websiteUri ? escapeSql(loc.websiteUri) : 'NULL',
    escapeSql(timezone),
    openingHours ? escapeSql(openingHours) : 'NULL',
  ]

  return `    (${values.join(', ')})`
}

function formatCategoryMappings(loc: GoogleMapsLocation): string[] {
  const categories = filterCategories(loc.types)

  // Sort categories to ensure parent categories come before children
  // This is important for database constraints that enforce category hierarchies
  const categoryOrder: Record<string, number> = {
    restaurant: 1,
    store: 1,
    lodging: 1,
    tourist_attraction: 1,
    bar: 1,
    cafe: 1,
  }

  const sorted = categories.sort((a, b) => {
    const orderA = categoryOrder[a] || 999
    const orderB = categoryOrder[b] || 999
    return orderA - orderB
  })

  return sorted.map(cat => `    ('${loc.id}', '${cat}')`)
}

async function main() {
  try {
    consola.start('Loading Google Maps raw data...')

    const rawDataPath = join(import.meta.dirname, '..', 'data', 'google_maps_raw.json')
    const rawContent = await readFile(rawDataPath, 'utf-8')
    const data: GoogleMapsData = JSON.parse(rawContent)

    consola.info(`Found ${data.locations.length} locations from ${data.metadata.downloaded_at}`)

    consola.start('Generating location SQL...')
    const locationRows = data.locations.map(formatLocationRow)

    consola.start('Generating category mappings...')
    const allCategoryMappings: string[] = []
    for (const loc of data.locations) {
      allCategoryMappings.push(...formatCategoryMappings(loc))
    }

    // Sort all category mappings to ensure parent categories are inserted before children
    // This is critical for database constraints that enforce category hierarchies
    const parentCategories = new Set(['restaurant', 'store', 'lodging', 'tourist_attraction', 'bar', 'cafe'])
    allCategoryMappings.sort((a, b) => {
      const catA = a.match(/'([^']+)'\)$/)?.[1] || ''
      const catB = b.match(/'([^']+)'\)$/)?.[1] || ''
      const isParentA = parentCategories.has(catA)
      const isParentB = parentCategories.has(catB)

      if (isParentA && !isParentB)
        return -1
      if (!isParentA && isParentB)
        return 1
      return 0
    })

    consola.info(`Generated ${allCategoryMappings.length} category mappings`)

    const sql = `-- Location seed data - Generated from Google Maps API data
-- Source: ${rawDataPath}
-- Downloaded: ${data.metadata.downloaded_at}
-- Total locations: ${data.metadata.total_locations}
--
-- Note: Images are NOT stored in the database. The 'photo' field is NULL.
-- Images are fetched on-demand via /api/images/location/[uuid] which uses gmapsPlaceId
-- to fetch photos from Google Maps API and cache them in NuxtHub Blob storage.

-- Temporarily disable the category hierarchy trigger for bulk insert
ALTER TABLE location_categories DISABLE TRIGGER category_hierarchy_insert_check;

-- Insert locations with split address fields
WITH seed_data(name, street, city, postal_code, region, country, lng, lat, rating, rating_count, photo, place_id, map_url, website, timezone, opening_hours) AS (
  VALUES
${locationRows.join(',\n')}
),
-- Insert locations and capture their UUIDs
inserted_locations AS (
  INSERT INTO locations (name, street, city, postal_code, region, country, location, rating, rating_count, photo, gmaps_place_id, gmaps_url, website, source, timezone, opening_hours)
  SELECT
    name,
    street,
    city,
    postal_code,
    region,
    country,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    rating,
    rating_count,
    photo,
    place_id,
    map_url,
    website,
    'naka',
    timezone,
    opening_hours
  FROM seed_data
  ON CONFLICT (gmaps_place_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    street = EXCLUDED.street,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    region = EXCLUDED.region,
    country = EXCLUDED.country,
    location = EXCLUDED.location,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    website = EXCLUDED.website,
    timezone = EXCLUDED.timezone,
    opening_hours = EXCLUDED.opening_hours,
    updated_at = NOW()
  RETURNING uuid, gmaps_place_id
)
-- Link locations to their categories
INSERT INTO location_categories (location_uuid, category_id)
SELECT
  inserted_locations.uuid,
  categories.category_id
FROM inserted_locations
JOIN (
  VALUES
${allCategoryMappings.join(',\n')}
) AS categories(place_id, category_id) ON inserted_locations.gmaps_place_id = categories.place_id
ON CONFLICT (location_uuid, category_id) DO NOTHING;

-- Re-enable the category hierarchy trigger
ALTER TABLE location_categories ENABLE TRIGGER category_hierarchy_insert_check;
`

    const outputPath = join(import.meta.dirname, '..', 'sql', '3.naka.sql')
    await writeFile(outputPath, sql, 'utf-8')

    consola.success(`Generated ${outputPath}`)
    consola.info(`Total locations: ${data.locations.length}`)
    consola.info(`Total category mappings: ${allCategoryMappings.length}`)
    consola.box('✓ Run `pnpm run db:restart` to apply the updated data')
  }
  catch (error) {
    consola.error('Failed to generate SQL:', error)
    if (error instanceof Error) {
      consola.error('Error details:', error.message)
      if (error.stack)
        consola.debug('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

main()

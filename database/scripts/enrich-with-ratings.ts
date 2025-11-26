import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('enrich-google')

interface GoogleMapsLocation {
  id: string
  types?: string[]
  formattedAddress?: string
  location?: { latitude: number, longitude: number }
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  websiteUri?: string
  utcOffsetMinutes?: number
  displayName: { text: string, languageCode: string }
  currentOpeningHours?: {
    openNow?: boolean
    periods?: Array<{
      open?: { day: number, hour: number, minute: number }
      close?: { day: number, hour: number, minute: number }
    }>
    weekdayDescriptions?: string[]
  }
  photos?: Array<{ name: string }>
}

interface GoogleMapsData {
  metadata: Record<string, unknown>
  locations: GoogleMapsLocation[]
}

interface GooglePlaceDetails {
  result: {
    rating?: number
    user_ratings_total?: number
    types?: string[]
    photos?: Array<{ photo_reference: string }>
    website?: string
    url?: string
    formatted_address?: string
    current_opening_hours?: {
      open_now?: boolean
      weekday_text?: string[]
      periods?: Array<{
        open?: { day: number, time: string }
        close?: { day: number, time: string }
      }>
    }
    utc_offset?: number
    geometry?: { location?: { lat?: number, lng?: number } }
  }
  status: string
}

const EXCLUDED_TYPES = new Set([
  'point_of_interest',
  'establishment',
  'food',
  'health',
  'finance',
  'place_of_worship',
])

async function loadSupportedCategories(): Promise<Set<string>> {
  const categoriesPath = join(import.meta.dirname, 'categories.json')
  const content = await readFile(categoriesPath, 'utf-8')
  const categories = JSON.parse(content)
  return new Set(categories.map((c: any) => c.id))
}

function normalizeTypes(types: string[] | undefined, supported: Set<string>): string[] {
  if (!types?.length)
    return []

  const filtered = types
    .filter(type => !EXCLUDED_TYPES.has(type))
    .filter(type => supported.has(type))

  return Array.from(new Set(filtered))
}

function parseTime(time?: string) {
  if (!time || time.length !== 4)
    return null
  const hour = Number.parseInt(time.slice(0, 2), 10)
  const minute = Number.parseInt(time.slice(2), 10)
  if (Number.isNaN(hour) || Number.isNaN(minute))
    return null
  return { hour, minute }
}

function convertOpeningHours(opening?: GooglePlaceDetails['result']['current_opening_hours']): GoogleMapsLocation['currentOpeningHours'] | undefined {
  if (!opening)
    return undefined

  const periods = opening.periods?.map((period) => {
    const open = period.open && parseTime(period.open.time)
    const close = period.close && parseTime(period.close.time)

    return {
      open: period.open && open ? { day: period.open.day, hour: open.hour, minute: open.minute } : undefined,
      close: period.close && close ? { day: period.close.day, hour: close.hour, minute: close.minute } : undefined,
    }
  }).filter(p => p.open || p.close) || []

  return {
    openNow: opening.open_now,
    periods,
    weekdayDescriptions: opening.weekday_text || [],
  }
}

function needsEnrichment(loc: GoogleMapsLocation): string[] {
  const reasons: string[] = []
  if (!loc.types || loc.types.length === 0)
    reasons.push('categories')
  if (loc.rating === undefined || loc.userRatingCount === undefined)
    reasons.push('rating')
  if (!loc.websiteUri)
    reasons.push('website')
  if (!loc.photos || loc.photos.length === 0)
    reasons.push('photos')
  if (!loc.currentOpeningHours?.weekdayDescriptions?.length)
    reasons.push('opening-hours')
  return reasons
}

async function fetchGooglePlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails | null> {
  try {
    const fields = [
      'rating',
      'user_ratings_total',
      'types',
      'photos',
      'website',
      'url',
      'formatted_address',
      'current_opening_hours',
      'utc_offset',
      'geometry/location',
    ].join(',')
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      consola.warn(`Google Places API error for ${placeId}: ${data.status}`)
      return null
    }

    return data
  }
  catch (error) {
    consola.error(`Failed to fetch Google Places details for ${placeId}:`, error)
    return null
  }
}

async function main() {
  try {
    const googleApiKey = process.env.GOOGLE_API_KEY
    const force = process.argv.includes('--force')

    if (!googleApiKey) {
      consola.error('GOOGLE_API_KEY environment variable is required')
      process.exit(1)
    }

    consola.start('Loading existing google_maps_raw.json...')
    const dataPath = join(import.meta.dirname, '..', 'data', 'google_maps_raw.json')
    const rawContent = await readFile(dataPath, 'utf-8')
    const data: GoogleMapsData = JSON.parse(rawContent)

    const supportedCategories = await loadSupportedCategories()

    consola.success(`Loaded ${data.locations.length} locations`)

    consola.start('Enriching with Google Places details...')
    let enrichedCount = 0
    let skippedCount = 0

    for (let i = 0; i < data.locations.length; i++) {
      const location = data.locations[i]
      const missing = needsEnrichment(location)

      if (!force && missing.length === 0) {
        skippedCount++
        continue
      }

      consola.info(`[${i + 1}/${data.locations.length}] Fetching details for ${location.displayName.text} (${missing.join(', ') || 'forced'})`)

      const details = await fetchGooglePlaceDetails(location.id, googleApiKey)

      if (details?.result) {
        const updated: string[] = []

        if (details.result.rating !== undefined) {
          location.rating = details.result.rating
          updated.push('rating')
        }

        if (details.result.user_ratings_total !== undefined) {
          location.userRatingCount = details.result.user_ratings_total
          updated.push('userRatingCount')
        }

        const normalizedTypes = normalizeTypes(details.result.types, supportedCategories)
        if (normalizedTypes.length > 0) {
          location.types = normalizedTypes
          updated.push('types')
        }

        if (details.result.photos?.length) {
          location.photos = details.result.photos
            .map(photo => photo.photo_reference ? { name: photo.photo_reference } : null)
            .filter(Boolean) as Array<{ name: string }>
          updated.push('photos')
        }

        if (details.result.website && !location.websiteUri) {
          location.websiteUri = details.result.website
          updated.push('website')
        }

        if (details.result.url && !location.googleMapsUri) {
          location.googleMapsUri = details.result.url
          updated.push('googleMapsUri')
        }

        if (details.result.formatted_address) {
          location.formattedAddress = details.result.formatted_address
          updated.push('formattedAddress')
        }

        if (details.result.utc_offset !== undefined) {
          location.utcOffsetMinutes = details.result.utc_offset
          updated.push('utcOffsetMinutes')
        }

        const opening = convertOpeningHours(details.result.current_opening_hours)
        if (opening) {
          location.currentOpeningHours = opening
          updated.push('openingHours')
        }

        if (details.result.geometry?.location?.lat !== undefined && details.result.geometry.location.lng !== undefined) {
          location.location = {
            latitude: details.result.geometry.location.lat,
            longitude: details.result.geometry.location.lng,
          }
          updated.push('location')
        }

        if (updated.length > 0)
          consola.success(`Updated ${location.displayName.text}: ${updated.join(', ')}`)

        enrichedCount++
      }

      // Rate limiting: wait 100ms between requests
      if (i < data.locations.length - 1)
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Update metadata
    data.metadata.enriched_at = new Date().toISOString()
    data.metadata.enriched_count = enrichedCount

    await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8')

    consola.success(`Enriched ${enrichedCount} locations, skipped ${skippedCount} (already complete${force ? ' but forced fetch enabled' : ''})`)
    consola.box('✓ Next step: Run `nr db:clean-locations` then `nr db:prepare-data` to regenerate SQL')
  }
  catch (error) {
    consola.error('Failed to enrich Google data:', error)
    if (error instanceof Error) {
      consola.error('Error details:', error.message)
      if (error.stack)
        consola.debug('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

main()

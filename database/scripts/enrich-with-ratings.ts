import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('enrich-ratings')

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
  currentOpeningHours?: any
  photos?: Array<{ name: string }>
}

interface GoogleMapsData {
  metadata: any
  locations: GoogleMapsLocation[]
}

interface GooglePlaceDetails {
  result: {
    rating?: number
    user_ratings_total?: number
    types?: string[]
    photos?: Array<{ photo_reference: string }>
  }
  status: string
}

async function fetchGooglePlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails | null> {
  try {
    const fields = 'rating,user_ratings_total,types,photos'
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

    if (!googleApiKey) {
      consola.error('GOOGLE_API_KEY environment variable is required')
      process.exit(1)
    }

    consola.start('Loading existing google_maps_raw.json...')
    const dataPath = join(import.meta.dirname, '..', 'data', 'google_maps_raw.json')
    const rawContent = await readFile(dataPath, 'utf-8')
    const data: GoogleMapsData = JSON.parse(rawContent)

    consola.success(`Loaded ${data.locations.length} locations`)

    consola.start('Enriching with Google Places ratings...')
    let enrichedCount = 0
    let skippedCount = 0

    for (let i = 0; i < data.locations.length; i++) {
      const location = data.locations[i]

      // Skip if already has rating
      if (location.rating !== undefined && location.userRatingCount !== undefined) {
        skippedCount++
        continue
      }

      consola.info(`[${i + 1}/${data.locations.length}] Fetching ratings for ${location.displayName.text}`)

      const details = await fetchGooglePlaceDetails(location.id, googleApiKey)

      if (details?.result) {
        if (details.result.rating !== undefined)
          location.rating = details.result.rating

        if (details.result.user_ratings_total !== undefined)
          location.userRatingCount = details.result.user_ratings_total

        if (details.result.types && details.result.types.length > 0)
          location.types = details.result.types

        if (details.result.photos && details.result.photos.length > 0)
          location.photos = details.result.photos.map(p => ({ name: p.photo_reference }))

        enrichedCount++
      }

      // Rate limiting: wait 100ms between requests
      if (i < data.locations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Update metadata
    data.metadata.enriched_at = new Date().toISOString()
    data.metadata.enriched_count = enrichedCount

    await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8')

    consola.success(`Enriched ${enrichedCount} locations, skipped ${skippedCount} (already had ratings)`)
    consola.box('✓ Next step: Run `nr db:prepare-data` to regenerate SQL')
  }
  catch (error) {
    consola.error('Failed to enrich ratings:', error)
    if (error instanceof Error) {
      consola.error('Error details:', error.message)
      if (error.stack)
        consola.debug('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

main()

import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('validate-google-raw')

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
  displayName?: { text: string, languageCode?: string }
  currentOpeningHours?: {
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

const BOUNDS = {
  lat: [45.7, 46.3],
  lng: [8.4, 9.4],
}

async function loadSupportedCategories(): Promise<Set<string>> {
  const categoriesPath = join(import.meta.dirname, 'categories.json')
  const content = await readFile(categoriesPath, 'utf-8')
  const categories = JSON.parse(content)
  return new Set(categories.map((c: any) => c.id))
}

function isWithinBounds(lat: number | undefined, lng: number | undefined): boolean {
  if (lat === undefined || lng === undefined)
    return false
  return lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1] && lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1]
}

function validateLocation(loc: GoogleMapsLocation, supportedCategories: Set<string>) {
  const problems: string[] = []

  if (!loc.displayName?.text)
    problems.push('missing name')

  if (!loc.googleMapsUri)
    problems.push('missing googleMapsUri')

  if (!loc.location?.latitude || !loc.location?.longitude || !isWithinBounds(loc.location.latitude, loc.location.longitude))
    problems.push('invalid lat/lng')

  const types = loc.types || []
  if (types.length === 0) {
    problems.push('missing categories')
  }
  else {
    const unsupported = types.filter(type => !supportedCategories.has(type) && type !== 'point_of_interest')
    if (unsupported.length > 0)
      problems.push(`unsupported categories: ${unsupported.join(', ')}`)
  }

  if (loc.rating === undefined || loc.userRatingCount === undefined)
    problems.push('missing rating')

  if (!loc.websiteUri)
    problems.push('missing website')

  if (!loc.photos || loc.photos.length === 0)
    problems.push('missing photos')

  if (!loc.currentOpeningHours?.weekdayDescriptions || !loc.currentOpeningHours.weekdayDescriptions.length)
    problems.push('missing opening hours')

  return problems
}

async function main() {
  consola.start('Loading google_maps_raw.json...')
  const dataPath = join(import.meta.dirname, '..', 'data', 'google_maps_raw.json')
  const rawContent = await readFile(dataPath, 'utf-8')
  const data: GoogleMapsData = JSON.parse(rawContent)

  const supportedCategories = await loadSupportedCategories()

  const summary = {
    total: data.locations.length,
    missingCategories: 0,
    missingRating: 0,
    missingWebsite: 0,
    missingPhotos: 0,
    missingOpeningHours: 0,
    invalidLatLng: 0,
    unsupportedCategoryLocations: 0,
  }

  const issues: Array<{ id: string, name: string, problems: string[] }> = []
  const seenIds = new Set<string>()
  let duplicateIds = 0

  for (const loc of data.locations) {
    if (seenIds.has(loc.id))
      duplicateIds++
    seenIds.add(loc.id)

    const kinds = validateLocation(loc, supportedCategories)
    if (kinds.length > 0) {
      issues.push({ id: loc.id, name: loc.displayName?.text || '<no-name>', problems: kinds })

      if (kinds.includes('missing categories'))
        summary.missingCategories++
      if (kinds.includes('missing rating'))
        summary.missingRating++
      if (kinds.includes('missing website'))
        summary.missingWebsite++
      if (kinds.includes('missing photos'))
        summary.missingPhotos++
      if (kinds.includes('missing opening hours'))
        summary.missingOpeningHours++
      if (kinds.includes('invalid lat/lng'))
        summary.invalidLatLng++
      if (kinds.some(k => k.startsWith('unsupported categories')))
        summary.unsupportedCategoryLocations++
    }
  }

  consola.box([
    `Total locations: ${summary.total}`,
    `Missing categories: ${summary.missingCategories}`,
    `Missing rating: ${summary.missingRating}`,
    `Missing website: ${summary.missingWebsite}`,
    `Missing photos: ${summary.missingPhotos}`,
    `Missing opening hours: ${summary.missingOpeningHours}`,
    `Invalid lat/lng: ${summary.invalidLatLng}`,
    `Unsupported category sets: ${summary.unsupportedCategoryLocations}`,
    `Duplicate place IDs: ${duplicateIds}`,
  ].join('\n'))

  const sorted = issues.sort((a, b) => b.problems.length - a.problems.length || a.name.localeCompare(b.name))
  const topIssues = sorted.slice(0, 10)

  if (topIssues.length > 0) {
    consola.start('Top offenders (first 10):')
    topIssues.forEach((issue, index) => {
      consola.info(`${index + 1}. ${issue.name} (${issue.id}) → ${issue.problems.join('; ')}`)
    })
  }

  consola.success(`Found ${issues.length} locations with at least one issue`)
  consola.info('Run this after fetching new data to verify coverage.')
}

main().catch((error) => {
  consola.error('Validation failed:', error)
  process.exit(1)
})

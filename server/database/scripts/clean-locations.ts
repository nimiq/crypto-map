import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('clean-locations')

interface GoogleMapsLocation {
  id: string
  types: string[]
  displayName: { text: string, languageCode: string }
  location?: { latitude?: number, longitude?: number }
  formattedAddress?: string
  [key: string]: any
}

interface GoogleMapsData {
  metadata: any
  locations: GoogleMapsLocation[]
}

const BOUNDS = {
  lat: [45.7, 46.3],
  lng: [8.4, 9.4],
}

// Load supported categories
async function loadSupportedCategories(): Promise<Set<string>> {
  const categoriesPath = join(import.meta.dirname, 'categories.json')
  const content = await readFile(categoriesPath, 'utf-8')
  const categories = JSON.parse(content)
  return new Set(categories.map((c: any) => c.id))
}

function isWithinBounds(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined)
    return false
  return lat >= BOUNDS.lat[0] && lat <= BOUNDS.lat[1] && lng >= BOUNDS.lng[0] && lng <= BOUNDS.lng[1]
}

function cleanName(name: string): string {
  // List of words that should remain lowercase (articles, conjunctions, prepositions)
  const lowercase = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'di', 'da', 'del', 'della', 'de', 'la', 'le', 'el', 'los', 'las', 'y', 'e', 'per'])

  // Handle all caps (convert to title case)
  if (name === name.toUpperCase() && name.length > 3) {
    return name
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        // Always capitalize first word
        if (index === 0)
          return word.charAt(0).toUpperCase() + word.slice(1)
        // Keep lowercase words lowercase unless they're first
        if (lowercase.has(word))
          return word
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  // Fix common patterns
  const cleaned = name
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim()

  return cleaned
}

function mapCategories(types: string[], supportedCategories: Set<string>): string[] {
  // Filter to only supported categories
  const mapped = types.filter(type => supportedCategories.has(type))

  // Always ensure at least point_of_interest or establishment if nothing else
  if (mapped.length === 0 && types.length > 0) {
    if (types.includes('point_of_interest'))
      return ['point_of_interest']
    if (types.includes('establishment'))
      return ['establishment']
  }

  return mapped
}

function guessCategoriesFromName(name: string, supportedCategories: Set<string>): string[] {
  const lower = name.toLowerCase()
  const guesses: string[] = []

  const patterns: Array<{ match: RegExp, category: string }> = [
    { match: /\b(pizzeria|pizza)\b/, category: 'restaurant' },
    { match: /\b(ristorante|restaurant|osteria|trattoria|bistrot|bistro|grill|braceria)\b/, category: 'restaurant' },
    { match: /\b(caf[eè]|coffee|caffetteria)\b/, category: 'cafe' },
    { match: /\b(bar|lounge|pub)\b/, category: 'bar' },
    { match: /\b(hotel|hostel|motel|albergo)\b/, category: 'lodging' },
    { match: /\b(supermercado|supermercato|supermarket|coop|migros)\b/, category: 'supermarket' },
    { match: /\b(grocery|alimentari|mini market|market)\b/, category: 'grocery_store' },
    { match: /\b(pharmacy|farmacia|apotheke)\b/, category: 'pharmacy' },
    { match: /\b(bakery|boulangerie|panetteria|pasticceria|patisserie)\b/, category: 'bakery' },
    { match: /\b(hair|barber|salon|coiffeur|parrucchieri|parrucchiere)\b/, category: 'hair_care' },
    { match: /\b(jewelry|gioielleria)\b/, category: 'jewelry_store' },
    { match: /\b(clothing|fashion|boutique|apparel|outfit)\b/, category: 'clothing_store' },
    { match: /\b(shoes?|sneaker)\b/, category: 'shoe_store' },
    { match: /\b(gym|fitness|crossfit|palestra)\b/, category: 'gym' },
    { match: /\b(spa|wellness|terme)\b/, category: 'spa' },
    { match: /\b(car dealer|auto|concessionaria)\b/, category: 'car_dealer' },
    { match: /\b(electric|electronics|hi[- ]?fi|computer|phone|telefonia)\b/, category: 'electronics_store' },
  ]

  for (const pattern of patterns) {
    if (pattern.match.test(lower) && supportedCategories.has(pattern.category)) {
      guesses.push(pattern.category)
      break
    }
  }

  return guesses
}

async function main() {
  try {
    consola.start('Loading data...')
    const dataPath = join(import.meta.dirname, '..', 'data', 'google_maps_raw.json')
    const rawContent = await readFile(dataPath, 'utf-8')
    const data: GoogleMapsData = JSON.parse(rawContent)

    const supportedCategories = await loadSupportedCategories()
    consola.success(`Loaded ${data.locations.length} locations and ${supportedCategories.size} supported categories`)

    let namesModified = 0
    let typesModified = 0
    let typesGuessed = 0
    let removedOutOfBounds = 0
    let unchanged = 0

    consola.start('Cleaning locations automatically...')

    const cleanedLocations: GoogleMapsLocation[] = []

    for (let i = 0; i < data.locations.length; i++) {
      const location = data.locations[i]

      const lat = location.location?.latitude
      const lng = location.location?.longitude
      if (!isWithinBounds(lat, lng)) {
        removedOutOfBounds++
        consola.warn(`[${i + 1}/${data.locations.length}] Dropping out-of-bounds location ${location.displayName.text} (${lat}, ${lng})`)
        continue
      }

      const originalName = location.displayName.text
      const cleanedName = cleanName(originalName)
      const originalTypes = location.types || []
      const mappedTypes = mapCategories(originalTypes, supportedCategories)

      const nameChanged = originalName !== cleanedName
      let typesChanged = JSON.stringify(originalTypes.sort()) !== JSON.stringify(mappedTypes.sort())

      if (nameChanged) {
        consola.info(`[${i + 1}/${data.locations.length}] Name: "${originalName}" → "${cleanedName}"`)
        location.displayName.text = cleanedName
        namesModified++
      }

      let finalTypes = mappedTypes
      if (finalTypes.length === 0) {
        const guesses = guessCategoriesFromName(cleanedName, supportedCategories)
        if (guesses.length > 0) {
          finalTypes = guesses
          typesGuessed++
          typesChanged = true
          consola.info(`[${i + 1}/${data.locations.length}] ${cleanedName}: Guessed categories ${guesses.join(', ')}`)
        }
      }

      if (typesChanged) {
        const removed = originalTypes.filter(t => !finalTypes.includes(t))
        if (removed.length > 0) {
          consola.info(`[${i + 1}/${data.locations.length}] ${originalName}: Removed unsupported types: [${removed.join(', ')}]`)
        }
        location.types = finalTypes
        typesModified++
      }

      if (!nameChanged && !typesChanged) {
        unchanged++
      }

      cleanedLocations.push(location)
    }

    // Update metadata
    data.metadata.cleaned_at = new Date().toISOString()
    data.metadata.names_cleaned = namesModified
    data.metadata.types_cleaned = typesModified
    data.metadata.types_guessed = typesGuessed
    data.metadata.removed_out_of_bounds = removedOutOfBounds

    data.locations = cleanedLocations

    await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8')

    consola.success(`\nCleaning complete!`)
    consola.info(`Names modified: ${namesModified}`)
    consola.info(`Types modified: ${typesModified}`)
    consola.info(`Types guessed from name: ${typesGuessed}`)
    consola.info(`Removed (out of Lugano bounds): ${removedOutOfBounds}`)
    consola.info(`Unchanged: ${unchanged}`)
    consola.box('✓ Next: Run `nr db:prepare-data` to regenerate SQL')
  }
  catch (error) {
    consola.error('Failed to clean locations:', error)
    process.exit(1)
  }
}

main()

import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('clean-locations')

interface GoogleMapsLocation {
  id: string
  types: string[]
  displayName: { text: string, languageCode: string }
  [key: string]: any
}

interface GoogleMapsData {
  metadata: any
  locations: GoogleMapsLocation[]
}

// Load supported categories
async function loadSupportedCategories(): Promise<Set<string>> {
  const categoriesPath = join(import.meta.dirname, 'categories.json')
  const content = await readFile(categoriesPath, 'utf-8')
  const categories = JSON.parse(content)
  return new Set(categories.map((c: any) => c.id))
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
  let cleaned = name
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
    let unchanged = 0

    consola.start('Cleaning locations automatically...')

    for (let i = 0; i < data.locations.length; i++) {
      const location = data.locations[i]
      const originalName = location.displayName.text
      const cleanedName = cleanName(originalName)
      const originalTypes = location.types || []
      const mappedTypes = mapCategories(originalTypes, supportedCategories)

      const nameChanged = originalName !== cleanedName
      const typesChanged = JSON.stringify(originalTypes.sort()) !== JSON.stringify(mappedTypes.sort())

      if (nameChanged) {
        consola.info(`[${i + 1}/${data.locations.length}] Name: "${originalName}" → "${cleanedName}"`)
        location.displayName.text = cleanedName
        namesModified++
      }

      if (typesChanged) {
        const removed = originalTypes.filter(t => !mappedTypes.includes(t))
        if (removed.length > 0) {
          consola.info(`[${i + 1}/${data.locations.length}] ${originalName}: Removed unsupported types: [${removed.join(', ')}]`)
        }
        location.types = mappedTypes
        typesModified++
      }

      if (!nameChanged && !typesChanged) {
        unchanged++
      }
    }

    // Update metadata
    data.metadata.cleaned_at = new Date().toISOString()
    data.metadata.names_cleaned = namesModified
    data.metadata.types_cleaned = typesModified

    await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8')

    consola.success(`\nCleaning complete!`)
    consola.info(`Names modified: ${namesModified}`)
    consola.info(`Types modified: ${typesModified}`)
    consola.info(`Unchanged: ${unchanged}`)
    consola.box('✓ Next: Run `nr db:prepare-data` to regenerate SQL')
  }
  catch (error) {
    consola.error('Failed to clean locations:', error)
    process.exit(1)
  }
}

main()

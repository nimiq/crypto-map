import type { Map } from 'maplibre-gl'
import { consola } from 'consola'

const logger = consola.withTag('map-markers')

export function useMapIcons() {
  const layersAdded = ref(false)

  /**
   * Load all category icons as SDF images
   */
  async function loadIcons(map: Map) {
    const icons = [
      'airport', 'aquarium', 'atm', 'bank', 'bar', 'bus', 'cafe',
      'gas', 'golf', 'grocery', 'historic', 'lodging', 'misc',
      'movie', 'museum', 'pharmacy', 'post_office', 'restaurant',
      'shopping', 'theater', 'train'
    ]

    const promises = icons.map(async (icon) => {
      if (map.hasImage(icon)) return

      try {
        const img = new Image()
        img.src = `/assets/icons/categories/${icon}.svg`
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
        map.addImage(icon, img, { sdf: true })
      } catch (e) {
        logger.error(`Failed to load icon: ${icon}`, e)
      }
    })

    await Promise.all(promises)
  }

  /**
   * Add marker layers to map
   */
  async function addMarkerLayers(map: Map) {
    await loadIcons(map)

    // Build color expression using category_id patterns
    const colorExpression = [
      'match',
      ['get', 'category_id'],
      ...buildColorMatches(),
      CATEGORY_COLORS.MUNICIPAL, // default
    ] as unknown as string

    // Build icon expression
    const iconExpression = [
      'match',
      ['get', 'category_id'],
      ...buildIconMatches(),
      'misc', // default icon
    ] as unknown as string

    // Icon (symbol layer containing the whole pin)
    if (!map.getLayer('location-icon')) {
      map.addLayer({
        'id': 'location-icon',
        'type': 'symbol',
        'source': 'locations',
        'source-layer': 'locations',
        'minzoom': 0,
        'maxzoom': 24,
        'layout': {
          'icon-image': iconExpression,
          'icon-size': 0.1125,
          'icon-allow-overlap': false,
          'icon-anchor': 'right',
          'icon-offset': [-8, 0],
          'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'rating'], 0]],
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-anchor': 'left',
          'text-offset': [0.7, 0],
          'text-justify': 'left',
          'text-size': 10,
          'text-optional': true, // Hide text if it collides, but keep the icon
        },
        'paint': {
          'icon-color': colorExpression,
          'icon-halo-color': '#FFFFFF',
          'icon-halo-width': 2,
          'icon-opacity': 1,
          'text-color': '#000000',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      })
      logger.info('Added location-icon layer')
    }
  }


  /**
   * Build MapLibre color match expression from category patterns
   */
  function buildColorMatches(): string[] {
    const commonMappings: Array<[string, string]> = [
      // Food & Drink
      ['restaurant', CATEGORY_COLORS.FOOD_DRINK],
      ['cafe', CATEGORY_COLORS.FOOD_DRINK],
      ['bar', CATEGORY_COLORS.FOOD_DRINK],
      ['bakery', CATEGORY_COLORS.FOOD_DRINK],
      // Retail
      ['store', CATEGORY_COLORS.RETAIL],
      ['supermarket', CATEGORY_COLORS.RETAIL],
      ['pharmacy', CATEGORY_COLORS.RETAIL],
      // Services
      ['atm', CATEGORY_COLORS.SERVICES],
      ['bank', CATEGORY_COLORS.SERVICES],
      ['gas_station', CATEGORY_COLORS.SERVICES],
      // Entertainment
      ['museum', CATEGORY_COLORS.ENTERTAINMENT],
      ['theater', CATEGORY_COLORS.ENTERTAINMENT],
      ['aquarium', CATEGORY_COLORS.ENTERTAINMENT],
      // Transportation
      ['airport', CATEGORY_COLORS.TRANSPORTATION],
      ['train_station', CATEGORY_COLORS.TRANSPORTATION],
      ['bus_station', CATEGORY_COLORS.TRANSPORTATION],
      // Outdoor
      ['park', CATEGORY_COLORS.OUTDOOR],
      ['stadium', CATEGORY_COLORS.OUTDOOR],
      // Emergency
      ['hospital', CATEGORY_COLORS.EMERGENCY],
      ['police', CATEGORY_COLORS.EMERGENCY],
    ]

    return commonMappings.flat()
  }

  /**
   * Build MapLibre icon match expression
   */
  function buildIconMatches(): string[] {
    // This is a simplified mapping for the style expression
    // Ideally we would use the same logic as getCategoryIcon but adapted for MapLibre expressions
    // For now, we'll map the most common exact matches
    const mappings: Array<[string, string]> = [
      ['restaurant', 'restaurant'],
      ['cafe', 'cafe'],
      ['bar', 'bar'],
      ['bakery', 'cafe'],
      ['store', 'shopping'],
      ['supermarket', 'grocery'],
      ['pharmacy', 'pharmacy'],
      ['atm', 'atm'],
      ['bank', 'bank'],
      ['gas_station', 'gas'],
      ['museum', 'museum'],
      ['theater', 'theater'],
      ['aquarium', 'aquarium'],
      ['airport', 'airport'],
      ['train_station', 'train'],
      ['bus_station', 'bus'],
      ['park', 'golf'], // fallback
      ['stadium', 'misc'],
      ['hospital', 'pharmacy'],
    ]
    return mappings.flat()
  }

  /**
   * Initialize marker layers
   */
  function initializeLayers(map: Map) {
    if (!layersAdded.value) {
      logger.info('Adding marker layers...')
      addMarkerLayers(map)
      layersAdded.value = true
    }
  }

  return {
    initializeLayers,
  }
}

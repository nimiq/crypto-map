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
      'active',
      'airport',
      'aquarium',
      'atm',
      'bank',
      'bar',
      'bus',
      'cafe',
      'gas',
      'golf',
      'grocery',
      'historic',
      'lodging',
      'misc',
      'movie',
      'museum',
      'pharmacy',
      'post_office',
      'restaurant',
      'shopping',
      'theater',
      'train',
    ]

    const promises = icons.map(async (icon) => {
      if (map.hasImage(icon))
        return

      try {
        const img = new Image()
        img.src = `/assets/map-pins/${icon}.svg`
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
        map.addImage(icon, img, { sdf: false })
      }
      catch (e) {
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
      labelColors.misc, // default
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
          'text-font': ['Mulish Regular'],
          'text-anchor': 'left',
          'text-offset': [0.15, -0.2],
          'text-justify': 'left',
          'text-size': 14,
          'text-optional': true, // Hide text if it collides, but keep the icon
        },
        'paint': {
          'icon-opacity': 1,
          'text-color': colorExpression,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      })
      logger.info('Added location-icon layer')
    }
  }

  /**
   * Build MapLibre color match expression from label colors
   */
  function buildColorMatches(): string[] {
    return Object.entries(labelColors).flat()
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

  /**
   * Highlight search results with active pins
   */
  function setSearchResults(map: Map, uuids: string[] | null) {
    logger.info('[setSearchResults] Called with:', { uuidsCount: uuids?.length || 0, uuids })

    if (!map.getLayer('location-icon')) {
      logger.warn('[setSearchResults] location-icon layer not found')
      return
    }

    if (uuids && uuids.length > 0) {
      logger.info('[setSearchResults] Setting active pins for search results')
      // All search results use active pin
      const iconExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        'active',
        buildIconExpression(),
      ]
      map.setLayoutProperty('location-icon', 'icon-image', iconExpression as any)
      
      // Red text for search results
      const textColorExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        '#B31412',
        buildColorExpression(),
      ]
      map.setPaintProperty('location-icon', 'text-color', textColorExpression as any)
      logger.info('[setSearchResults] Active pins applied')
    }
    else {
      logger.info('[setSearchResults] Resetting to normal pins')
      // Reset to normal icons
      const iconExpression = buildIconExpression()
      map.setLayoutProperty('location-icon', 'icon-image', iconExpression as any)
      
      const colorExpression = buildColorExpression()
      map.setPaintProperty('location-icon', 'text-color', colorExpression as any)
      logger.info('[setSearchResults] Normal pins applied')
    }
  }

  /**
   * Highlight selected location (single pin within search results)
   */
  function setSelectedLocation(map: Map, uuid: string | null) {
    if (!map.getLayer('location-icon'))
      return

    if (uuid) {
      // Update icon expression to use active pin for selected location
      const iconExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        'active',
        buildIconExpression(),
      ]
      map.setLayoutProperty('location-icon', 'icon-image', iconExpression as any)
      
      // Update text color to red for selected location
      const textColorExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        '#B31412',
        buildColorExpression(),
      ]
      map.setPaintProperty('location-icon', 'text-color', textColorExpression as any)
    }
    else {
      // Reset to normal icons
      const iconExpression = buildIconExpression()
      map.setLayoutProperty('location-icon', 'icon-image', iconExpression as any)
      
      const colorExpression = buildColorExpression()
      map.setPaintProperty('location-icon', 'text-color', colorExpression as any)
    }
  }

  function buildIconExpression() {
    return [
      'match',
      ['get', 'category_id'],
      ...buildIconMatches(),
      'misc',
    ]
  }

  function buildColorExpression() {
    return [
      'match',
      ['get', 'category_id'],
      ...buildColorMatches(),
      labelColors.misc,
    ]
  }

  return {
    initializeLayers,
    setSearchResults,
    setSelectedLocation,
  }
}

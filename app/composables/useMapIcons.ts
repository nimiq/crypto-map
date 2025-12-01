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
        'filter': ['!', ['has', 'point_count']], // Hide cluster circles (they have point_count)
        'minzoom': 10, // Show individual pins only at higher zoom (clusters disappear at 9)
        'maxzoom': 24,
        'layout': {
          'icon-image': iconExpression,
          'icon-size': 0.06328125,
          'icon-allow-overlap': false,
          'icon-anchor': 'bottom',
          'icon-offset': [0, 0],
          'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'rating'], 0]],
          'text-field': ['get', 'name'],
          'text-font': ['Mulish Regular'],
          'text-anchor': 'left',
          'text-offset': [1, -0.95],
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
   * Add user location layer (blue dot)
   */
  function addUserLocationLayer(map: Map) {
    // Add source for user location
    if (!map.getSource('user-location')) {
      map.addSource('user-location', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
    }

    // Add accuracy circle layer (scales with zoom and accuracy)
    if (!map.getLayer('user-location-accuracy')) {
      map.addLayer({
        id: 'user-location-accuracy',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': [
            'max',
            6, // Minimum visible radius
            [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              0,
              0,
              20,
              ['/', ['get', 'accuracy'], 0.075], // Rough meter-to-pixel conversion at zoom 20
            ],
          ] as any,
          'circle-color': '#4285F4',
          'circle-opacity': 0.1,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#4285F4',
          'circle-stroke-opacity': 0.3,
        },
      })
    }

    // Add blue dot layer (scales with zoom)
    if (!map.getLayer('user-location-dot')) {
      map.addLayer({
        id: 'user-location-dot',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 10, 6, 18, 10],
          'circle-color': '#4285F4',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 18, 3],
          'circle-stroke-color': '#FFFFFF',
        },
      })
    }

    logger.info('Added user location layers')
  }

  /**
   * Update user location on map
   */
  function updateUserLocation(map: Map, point: { lng: number, lat: number } | null, accuracy: number | null) {
    const source = map.getSource('user-location') as maplibregl.GeoJSONSource
    if (!source) {
      logger.warn('user-location source not found')
      return
    }

    if (point && accuracy) {
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.lng, point.lat],
          },
          properties: {
            accuracy,
          },
        }],
      })
    }
    else {
      // Clear the location
      source.setData({
        type: 'FeatureCollection',
        features: [],
      })
    }
  }

  /**
   * Initialize marker layers
   */
  function initializeLayers(map: Map) {
    if (!layersAdded.value) {
      logger.info('Adding marker layers...')
      addMarkerLayers(map)
      addUserLocationLayer(map)
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

      // Larger size for active pins
      const iconSizeExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        0.09492188, // 1.5x larger (0.06328125 * 1.5)
        0.06328125,
      ]
      map.setLayoutProperty('location-icon', 'icon-size', iconSizeExpression as any)

      // Higher priority (lower sort key) for active pins so they're always shown
      const symbolSortKeyExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        -999999, // Very high priority
        ['-', 0, ['coalesce', ['get', 'rating'], 0]], // Normal priority by rating
      ]
      map.setLayoutProperty('location-icon', 'symbol-sort-key', symbolSortKeyExpression as any)

      // Larger text for active pins
      const textSizeExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        16, // 14 * 1.14 ≈ 16
        14,
      ]
      map.setLayoutProperty('location-icon', 'text-size', textSizeExpression as any)

      // Force text to show over other pins for active locations
      const textAllowOverlapExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        true,
        false,
      ]
      map.setLayoutProperty('location-icon', 'text-allow-overlap', textAllowOverlapExpression as any)

      // Make text non-optional for active locations (always show)
      const textOptionalExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        false, // Force text to show
        true, // Allow text to be hidden if it collides
      ]
      map.setLayoutProperty('location-icon', 'text-optional', textOptionalExpression as any)

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

      // Reset to normal size
      map.setLayoutProperty('location-icon', 'icon-size', 0.06328125)

      // Reset symbol priority to default
      map.setLayoutProperty('location-icon', 'symbol-sort-key', ['-', 0, ['coalesce', ['get', 'rating'], 0]] as any)

      // Reset to normal text size
      map.setLayoutProperty('location-icon', 'text-size', 14)

      // Reset text overlap to default
      map.setLayoutProperty('location-icon', 'text-allow-overlap', false)

      // Reset text optional to default
      map.setLayoutProperty('location-icon', 'text-optional', true)

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

      // Larger size for selected location
      const iconSizeExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        0.09492188, // 1.5x larger (0.06328125 * 1.5)
        0.06328125,
      ]
      map.setLayoutProperty('location-icon', 'icon-size', iconSizeExpression as any)

      // Higher priority (lower sort key) for selected location so it's always shown
      const symbolSortKeyExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        -999999, // Very high priority
        ['-', 0, ['coalesce', ['get', 'rating'], 0]], // Normal priority by rating
      ]
      map.setLayoutProperty('location-icon', 'symbol-sort-key', symbolSortKeyExpression as any)

      // Larger text for selected location
      const textSizeExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        16, // 14 * 1.14 ≈ 16
        14,
      ]
      map.setLayoutProperty('location-icon', 'text-size', textSizeExpression as any)

      // Force text to show over other pins for selected location
      const textAllowOverlapExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        true,
        false,
      ]
      map.setLayoutProperty('location-icon', 'text-allow-overlap', textAllowOverlapExpression as any)

      // Make text non-optional for selected location (always show)
      const textOptionalExpression = [
        'case',
        ['==', ['get', 'uuid'], uuid],
        false, // Force text to show
        true, // Allow text to be hidden if it collides
      ]
      map.setLayoutProperty('location-icon', 'text-optional', textOptionalExpression as any)

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

      // Reset to normal size
      map.setLayoutProperty('location-icon', 'icon-size', 0.06328125)

      // Reset symbol priority to default
      map.setLayoutProperty('location-icon', 'symbol-sort-key', ['-', 0, ['coalesce', ['get', 'rating'], 0]] as any)

      // Reset to normal text size
      map.setLayoutProperty('location-icon', 'text-size', 14)

      // Reset text overlap to default
      map.setLayoutProperty('location-icon', 'text-allow-overlap', false)

      // Reset text optional to default
      map.setLayoutProperty('location-icon', 'text-optional', true)

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
    updateUserLocation,
  }
}

import type { Map } from 'maplibre-gl'
import { consola } from 'consola'
import { buildColorMatches, buildIconMatches, defaultColor } from '~/utils/category-mapping'

const logger = consola.withTag('map-markers')

// State tracking for search results and selection
const currentSearchUuids = ref<string[] | null>(null)
const currentSelectedUuid = ref<string | null>(null)

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
      'convenience',
      'gas',
      'golf',
      'grocery',
      'gym',
      'health',
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
        // Set explicit dimensions to ensure SVG renders correctly
        img.width = 349
        img.height = 397
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
      defaultColor, // default
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
        'minzoom': 9, // Show individual pins at zoom 9+ (clusters disappear at 8)
        'maxzoom': 24,
        'layout': {
          'icon-image': iconExpression,
          'icon-size': 0.057,
          'icon-allow-overlap': false,
          'icon-anchor': 'bottom',
          'icon-offset': [0, 0],
          'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'rating'], 0]],
          'text-field': ['get', 'name'],
          'text-font': ['Mulish Regular'],
          'text-anchor': 'left',
          'text-offset': [0.9, -0.9],
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

    // Selected location layer - always visible, renders on top
    if (!map.getLayer('selected-location')) {
      map.addLayer({
        'id': 'selected-location',
        'type': 'symbol',
        'source': 'locations',
        'source-layer': 'locations',
        'filter': ['==', ['get', 'uuid'], ''], // Initially hidden (matches nothing)
        'minzoom': 9,
        'maxzoom': 24,
        'layout': {
          'icon-image': 'active',
          'icon-size': 0.0855,
          'icon-allow-overlap': true, // Always visible
          'icon-ignore-placement': false, // Block other icons from rendering here
          'icon-anchor': 'bottom',
          'icon-offset': [0, 0],
          'symbol-sort-key': -999999, // Highest priority
          'text-field': ['get', 'name'],
          'text-font': ['Mulish Regular'],
          'text-anchor': 'left',
          'text-offset': [0.9, -0.9],
          'text-justify': 'left',
          'text-size': 16,
          'text-allow-overlap': true, // Always show text
          'text-ignore-placement': false, // Block other text from rendering here
        },
        'paint': {
          'icon-opacity': 1,
          'text-color': '#B31412',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      })
      logger.info('Added selected-location layer')
    }
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
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            6, // Minimum visible radius at low zoom
            20,
            ['max', 6, ['/', ['get', 'accuracy'], 0.075]], // Rough meter-to-pixel conversion at zoom 20
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
   * Apply styling to location-icon layer based on current search state
   */
  function applyLocationIconStyling(map: Map) {
    if (!map.getLayer('location-icon'))
      return

    const uuids = currentSearchUuids.value

    if (uuids && uuids.length > 0) {
      // Search results get active styling with priority
      const iconExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        'active',
        buildIconExpression(),
      ]
      map.setLayoutProperty('location-icon', 'icon-image', iconExpression as any)

      const iconSizeExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        0.0855,
        0.057,
      ]
      map.setLayoutProperty('location-icon', 'icon-size', iconSizeExpression as any)

      const symbolSortKeyExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        -999999, // High priority for search results
        ['-', 0, ['coalesce', ['get', 'rating'], 0]],
      ]
      map.setLayoutProperty('location-icon', 'symbol-sort-key', symbolSortKeyExpression as any)

      const textSizeExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        16,
        14,
      ]
      map.setLayoutProperty('location-icon', 'text-size', textSizeExpression as any)

      const textColorExpression = [
        'case',
        ['in', ['get', 'uuid'], ['literal', uuids]],
        '#B31412',
        buildColorExpression(),
      ]
      map.setPaintProperty('location-icon', 'text-color', textColorExpression as any)

      // Keep default collision behavior - search results win via symbol-sort-key
      map.setLayoutProperty('location-icon', 'text-allow-overlap', false)
      map.setLayoutProperty('location-icon', 'text-optional', true)
    }
    else {
      // Reset to normal styling
      map.setLayoutProperty('location-icon', 'icon-image', buildIconExpression() as any)
      map.setLayoutProperty('location-icon', 'icon-size', 0.057)
      map.setLayoutProperty('location-icon', 'symbol-sort-key', ['-', 0, ['coalesce', ['get', 'rating'], 0]] as any)
      map.setLayoutProperty('location-icon', 'text-size', 14)
      map.setPaintProperty('location-icon', 'text-color', buildColorExpression() as any)
      map.setLayoutProperty('location-icon', 'text-allow-overlap', false)
      map.setLayoutProperty('location-icon', 'text-optional', true)
    }
  }

  /**
   * Update location-icon filter to exclude selected uuid (rendered on separate layer)
   */
  function updateLocationIconFilter(map: Map) {
    if (!map.getLayer('location-icon'))
      return

    const baseFilter = ['!', ['has', 'point_count']] // Always exclude clusters

    if (currentSelectedUuid.value) {
      // Exclude selected uuid from main layer (it's on selected-location layer)
      map.setFilter('location-icon', ['all', baseFilter, ['!=', ['get', 'uuid'], currentSelectedUuid.value]] as any)
    }
    else {
      map.setFilter('location-icon', baseFilter as any)
    }
  }

  /**
   * Highlight search results with active pins (keeps all pins visible, just styles search results)
   */
  function setSearchResults(map: Map, uuids: string[] | null) {
    logger.info('[setSearchResults] Called with:', { uuidsCount: uuids?.length || 0 })

    // Store state
    currentSearchUuids.value = uuids

    if (!map.getLayer('location-icon')) {
      logger.warn('[setSearchResults] location-icon layer not found')
      return
    }

    // Apply styling based on search state
    applyLocationIconStyling(map)
    logger.info('[setSearchResults] Styling applied')
  }

  /**
   * Highlight selected location using dedicated layer (always visible)
   */
  function setSelectedLocation(map: Map, uuid: string | null) {
    logger.info('[setSelectedLocation] Called with:', { uuid })

    // Store state
    currentSelectedUuid.value = uuid

    if (!map.getLayer('location-icon') || !map.getLayer('selected-location'))
      return

    if (uuid) {
      // Show selected pin on dedicated layer
      map.setFilter('selected-location', ['==', ['get', 'uuid'], uuid] as any)

      // Exclude from main layer to avoid double rendering
      updateLocationIconFilter(map)

      logger.info('[setSelectedLocation] Selected location set:', uuid)
    }
    else {
      // Hide selected layer
      map.setFilter('selected-location', ['==', ['get', 'uuid'], ''] as any)

      // Restore main layer filter
      updateLocationIconFilter(map)

      // Restore search styling if active
      applyLocationIconStyling(map)

      logger.info('[setSelectedLocation] Selection cleared, search styling restored')
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
      defaultColor,
    ]
  }

  return {
    initializeLayers,
    setSearchResults,
    setSelectedLocation,
    updateUserLocation,
  }
}

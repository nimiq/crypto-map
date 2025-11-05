import type { Map } from 'maplibre-gl'
import { consola } from 'consola'

const logger = consola.withTag('map-icons')

interface IconCache {
  [key: string]: boolean // Track loaded icons
}

export function useMapIcons() {
  const loadedIcons = ref<IconCache>({})
  const layersAdded = ref(false)

  /**
   * Load icon from Nuxt Icon bundle and add to map as image
   */
  async function loadIconifyIcon(map: Map, iconName: string): Promise<boolean> {
    if (loadedIcons.value[iconName])
      return true

    try {
      // Strip 'i-' prefix from UnoCSS icon class format (e.g., 'i-tabler:car' -> 'tabler:car')
      const iconPath = iconName.startsWith('i-') ? iconName.slice(2) : iconName
      const [collection, icon] = iconPath.split(':')
      
      if (!collection || !icon) {
        logger.warn('Invalid icon format:', iconName)
        return false
      }

      // Fetch SVG directly from Iconify API
      const response = await fetch(`https://api.iconify.design/${collection}/${icon}.svg?color=%23E9B213&width=32&height=32`)
      
      if (!response.ok) {
        logger.warn('Failed to load icon from Iconify:', iconName, response.status)
        return false
      }

      const svgText = await response.text()

      // Convert SVG to image
      const img = new Image(32, 32)
      const blob = new Blob([svgText], { type: 'image/svg+xml' })
      const objectUrl = URL.createObjectURL(blob)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            // Add image to map
            if (!map.hasImage(iconName)) {
              map.addImage(iconName, img)
              loadedIcons.value[iconName] = true
              logger.info('Icon loaded from bundle:', iconName)
            }
            URL.revokeObjectURL(objectUrl)
            resolve()
          }
          catch (error) {
            logger.error('Error adding image to map:', error)
            reject(error)
          }
        }
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error(`Failed to load image: ${iconName}`))
        }
        img.src = objectUrl
      })

      return true
    }
    catch (error) {
      logger.error('Error loading icon:', iconName, error)
      return false
    }
  }

  /**
   * Add symbol layers to map after ensuring they don't exist
   */
  function addSymbolLayers(map: Map) {
    // Only add layers if they don't exist yet
    if (!map.getLayer('location-icons')) {
      map.addLayer({
        'id': 'location-icons',
        'type': 'symbol',
        'source': 'locations',
        'source-layer': 'locations',
        'layout': {
          'icon-image': [
            'coalesce',
            ['get', 'icon_name'],
            'i-tabler:map-pin',
          ],
          'icon-size': 1,
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
        },
      })
      logger.info('Added location-icons layer')
    }

    if (!map.getLayer('location-labels')) {
      map.addLayer({
        'id': 'location-labels',
        'type': 'symbol',
        'source': 'locations',
        'source-layer': 'locations',
        'layout': {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true,
        },
        'paint': {
          'text-color': '#1F2348',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      })
      logger.info('Added location-labels layer')
    }
  }

  /**
   * Initialize layers immediately - icons will load on-demand via styleimagemissing
   */
  function initializeLayers(map: Map) {
    if (!layersAdded.value) {
      logger.info('Adding symbol layers...')
      addSymbolLayers(map)
      layersAdded.value = true
    }
  }

  return {
    loadIconifyIcon,
    initializeLayers,
    loadedIcons: readonly(loadedIcons),
  }
}

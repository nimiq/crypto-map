import type { Map, Marker } from 'maplibre-gl'
import { consola } from 'consola'
import { Marker as MaplibreMarker } from 'maplibre-gl'
import { h, render } from 'vue'
import MapPin from '~/components/MapPin.vue'

const logger = consola.withTag('markers')

interface LocationFeature {
  uuid: string
  name: string
  category_ids?: string
  category_icons?: string
}

export function useMapMarkers() {
  const markers = new Map<string, Marker>()

  function createPinElement(feature: LocationFeature) {
    const categoryIds = feature.category_ids ? JSON.parse(feature.category_ids) : []
    const categoryIcons = feature.category_icons ? JSON.parse(feature.category_icons) : []

    // Use first category icon for pin
    const mainIcon = categoryIcons[0] || '📍'

    // Create badges for payment methods (N and bitcoin symbols)
    const badges = []
    if (categoryIds.includes('nimiq_accepted')) {
      badges.push({ icon: 'N', color: '#1F2348' })
    }
    if (categoryIds.includes('bitcoin_accepted')) {
      badges.push({ icon: '₿', color: '#F7931A' })
    }

    // Determine pin color based on category
    let color = '#E9B213' // Default yellow
    if (categoryIds.includes('restaurant') || categoryIds.includes('cafe')) {
      color = '#E9B213'
    }
    else if (categoryIds.includes('spa') || categoryIds.includes('beauty_salon')) {
      color = '#7C6BAD'
    }

    // Create Vue component instance
    const vnode = h(MapPin, { icon: mainIcon, badges, color })
    const container = document.createElement('div')
    render(vnode, container)

    return container.firstElementChild as HTMLElement
  }

  function addMarker(map: Map, feature: LocationFeature, lngLat: [number, number], onClick: (uuid: string) => void) {
    if (markers.has(feature.uuid)) {
      return
    }

    try {
      const el = createPinElement(feature)
      el.style.cursor = 'pointer'

      const marker = new MaplibreMarker({ element: el })
        .setLngLat(lngLat)
        .addTo(map)

      el.addEventListener('click', () => onClick(feature.uuid))

      markers.set(feature.uuid, marker)
    }
    catch (error) {
      logger.error('Error creating marker:', error)
    }
  }

  function removeMarker(uuid: string) {
    const marker = markers.get(uuid)
    if (marker) {
      marker.remove()
      markers.delete(uuid)
    }
  }

  function clearMarkers() {
    markers.forEach(marker => marker.remove())
    markers.clear()
  }

  function updateMarkers(map: Map, features: LocationFeature[], onClick: (uuid: string) => void) {
    const featureIds = new Set(features.map(f => f.uuid))

    // Remove markers that are no longer in features
    markers.forEach((_, uuid) => {
      if (!featureIds.has(uuid)) {
        removeMarker(uuid)
      }
    })

    // Add new markers
    features.forEach((feature) => {
      if (!markers.has(feature.uuid)) {
        // Extract coordinates from GeoJSON feature (assuming it's passed from MVT)
        // Note: This will be set from the map layer data
        const coords = [0, 0] as [number, number] // Placeholder - will be set from layer
        addMarker(map, feature, coords, onClick)
      }
    })
  }

  return {
    addMarker,
    removeMarker,
    clearMarkers,
    updateMarkers,
  }
}

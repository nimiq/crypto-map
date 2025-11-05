import type { StyleSpecification } from 'maplibre-gl'

export function getMapStyle(origin: string): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
      locations: {
        type: 'vector',
        tiles: [`${origin}/api/tiles/{z}/{x}/{y}.mvt`],
        minzoom: 0,
        maxzoom: 18,
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
      },
      {
        'id': 'location-loader',
        'type': 'circle',
        'source': 'locations',
        'source-layer': 'locations',
        'paint': {
          'circle-radius': 0,
          'circle-opacity': 0,
        },
      },
      // Icon and label layers will be added dynamically after icons are loaded
    ],
  }
}

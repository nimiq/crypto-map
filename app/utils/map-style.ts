import type { StyleSpecification } from 'maplibre-gl'

export const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
    locations: {
      type: 'vector',
      tiles: ['/api/tiles/{z}/{x}/{y}.mvt'],
      minzoom: 10,
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
      id: 'locations',
      type: 'circle',
      source: 'locations',
      'source-layer': 'locations',
      paint: {
        'circle-radius': 8,
        'circle-color': '#1F2348',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    },
  ],
}

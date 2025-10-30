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
      type: 'symbol',
      source: 'locations',
      'source-layer': 'locations',
      layout: {
        'icon-image': 'naka-logo',
        'icon-size': 1,
        'icon-allow-overlap': true,
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#1F2348',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    },
  ],
}

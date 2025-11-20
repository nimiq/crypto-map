import type { StyleSpecification } from 'maplibre-gl'

// Nimiq color palette (light mode) - converted from oklch to hex
const NIMIQ_COLORS = {
  white: '#FFFFFF',
  neutral50: '#FCF7E5', // Background light
  neutral100: '#F6F1E5', // Background
  neutral200: '#E9E3D2', // Light gray
  neutral300: '#D1CCC2', // Medium light gray
  neutral400: '#BDB9BB', // Medium gray
  neutral600: '#A3A19F', // Dark gray
  neutral700: '#6B6966', // Darker gray
  blue400: '#ACDAF7', // Light blue (water)
  blue600: '#86CCF0', // Blue
  green400: '#E0E8C9', // Very light green
  green500: '#BEE7AD', // Light green
  green600: '#A7CB83', // Green (parks)
  gold400: '#F3EBC3', // Very light beige
  gold500: '#E8DEAE', // Light beige
  orange500: '#E5D19E', // Beige
  red400: '#F9E1DC', // Very light red (hospitals)
} as const

export function getMapStyle(origin: string): StyleSpecification {
  return {
    version: 8,
    name: 'Nimiq Map Style',
    center: [0, 0],
    zoom: 1,
    bearing: 0,
    pitch: 0,
    sprite: 'https://api.maptiler.com/maps/streets/sprite',
    glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://api.maptiler.com/tiles/v3/tiles.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
      },
      locations: {
        type: 'vector',
        tiles: [`${origin}/api/tiles/{z}/{x}/{y}`],
        minzoom: 0,
        maxzoom: 18,
      },
    },
    layers: [
      // Background
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': NIMIQ_COLORS.neutral50,
        },
      },

      // Land cover
      {
        'id': 'landcover_grass',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'landcover',
        'filter': ['==', 'class', 'grass'],
        'paint': {
          'fill-color': NIMIQ_COLORS.green400,
          'fill-opacity': 0.3,
        },
      },
      {
        'id': 'landcover_wood',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'landcover',
        'filter': ['==', 'class', 'wood'],
        'paint': {
          'fill-color': NIMIQ_COLORS.green500,
          'fill-opacity': 0.4,
        },
      },

      // Parks
      {
        'id': 'park',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'park',
        'paint': {
          'fill-color': NIMIQ_COLORS.green600,
          'fill-opacity': 0.3,
        },
      },

      // Land use
      {
        'id': 'landuse_residential',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'landuse',
        'filter': ['in', 'class', 'residential', 'suburbs', 'neighbourhood'],
        'paint': {
          'fill-color': NIMIQ_COLORS.neutral200,
          'fill-opacity': 0.4,
        },
      },
      {
        'id': 'landuse_hospital',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'landuse',
        'filter': ['==', 'class', 'hospital'],
        'paint': {
          'fill-color': NIMIQ_COLORS.red400,
        },
      },
      {
        'id': 'landuse_school',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'landuse',
        'filter': ['==', 'class', 'school'],
        'paint': {
          'fill-color': NIMIQ_COLORS.gold400,
        },
      },

      // Water
      {
        'id': 'water',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'water',
        'paint': {
          'fill-color': NIMIQ_COLORS.blue400,
        },
      },
      {
        'id': 'waterway',
        'type': 'line',
        'source': 'openmaptiles',
        'source-layer': 'waterway',
        'paint': {
          'line-color': NIMIQ_COLORS.blue400,
          'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 13, 0.5, 20, 6],
        },
      },

      // Buildings
      {
        'id': 'building',
        'type': 'fill',
        'source': 'openmaptiles',
        'source-layer': 'building',
        'minzoom': 13,
        'paint': {
          'fill-color': NIMIQ_COLORS.neutral300,
          'fill-opacity': 0.4,
          'fill-outline-color': NIMIQ_COLORS.neutral400,
        },
      },

      // Roads
      {
        'id': 'road_minor',
        'type': 'line',
        'source': 'openmaptiles',
        'source-layer': 'transportation',
        'filter': ['in', 'class', 'minor', 'service'],
        'paint': {
          'line-color': NIMIQ_COLORS.white,
          'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 13, 1, 20, 8],
        },
      },
      {
        'id': 'road_major',
        'type': 'line',
        'source': 'openmaptiles',
        'source-layer': 'transportation',
        'filter': ['in', 'class', 'primary', 'secondary', 'tertiary'],
        'paint': {
          'line-color': NIMIQ_COLORS.gold500,
          'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 8, 0.5, 20, 13],
        },
      },
      {
        'id': 'road_motorway',
        'type': 'line',
        'source': 'openmaptiles',
        'source-layer': 'transportation',
        'filter': ['==', 'class', 'motorway'],
        'minzoom': 5,
        'paint': {
          'line-color': NIMIQ_COLORS.orange500,
          'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 5, 0, 7, 1, 20, 18],
        },
      },

    ],
  }
}

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
  darkblue: '#1F2348', // Dark blue (from Nimiq CSS - oklch(0.2737 0.068 276.29))
  green400: '#E0E8C9', // Very light green
  green500: '#BEE7AD', // Light green
  green600: '#A7CB83', // Green (parks)
  gold400: '#F3EBC3', // Very light beige
  gold500: '#E8DEAE', // Light beige
  orange500: '#E5D19E', // Beige
  red400: '#F9E1DC', // Very light red (hospitals)
} as const

// Stadia Maps vector tiles (OpenMapTiles schema)
const STADIA_TILES_URL = 'https://tiles.stadiamaps.com/data/openmaptiles.json?api_key=72b90deb-0790-4dcb-a39e-8584048fbf45'

export function getMapStyle(origin: string): StyleSpecification {
  return {
    version: 8,
    name: 'Nimiq Map Style',
    center: [0, 0],
    zoom: 1,
    bearing: 0,
    pitch: 0,
    // No sprite - we load custom icons via map.addImage() in useMapIcons.ts
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: STADIA_TILES_URL,
        attribution: '<a href="https://stadiamaps.com/">Stadia Maps</a> | <a href="https://openmaptiles.org/">© OpenMapTiles</a> | <a href="https://openstreetmap.org">© OpenStreetMap</a>',
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
        'minzoom': 8,
        'paint': {
          'line-color': NIMIQ_COLORS.blue600,
          'line-width': [
            'interpolate',
            ['exponential', 1.3],
            ['zoom'],
            8,
            ['match', ['get', 'class'], 'river', 0.5, 0.2],
            13,
            ['match', ['get', 'class'], 'river', 1.5, 0.5],
            20,
            ['match', ['get', 'class'], 'river', 8, 6],
          ],
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

      // Administrative boundaries (fade out at higher zooms to show more city labels)
      {
        'id': 'admin_country',
        'type': 'line',
        'source': 'openmaptiles',
        'source-layer': 'boundary',
        'filter': ['==', 'admin_level', 2],
        'paint': {
          'line-color': NIMIQ_COLORS.neutral600,
          'line-width': 1,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 5, 0.3, 8, 0.15],
        },
      },
      {
        'id': 'admin_state',
        'type': 'line',
        'source': 'openmaptiles',
        'source-layer': 'boundary',
        'filter': ['in', 'admin_level', 3, 4],
        'paint': {
          'line-color': NIMIQ_COLORS.neutral400,
          'line-width': 0.5,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 5, 0.2, 8, 0.1],
        },
      },

      // Water labels
      {
        'id': 'water_name',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'water_name',
        'minzoom': 10,
        'layout': {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Italic'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 16, 14],
        },
        'paint': {
          'text-color': NIMIQ_COLORS.blue600,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },
      {
        'id': 'waterway_name',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'waterway',
        'filter': ['==', 'class', 'river'],
        'minzoom': 12,
        'layout': {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Italic'],
          'text-size': 11,
          'symbol-placement': 'line',
          'text-rotation-alignment': 'map',
        },
        'paint': {
          'text-color': NIMIQ_COLORS.blue600,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },

      // Road labels
      {
        'id': 'road_label',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'transportation_name',
        'filter': ['in', 'class', 'motorway', 'trunk', 'primary'],
        'minzoom': 10,
        'layout': {
          'text-field': ['concat', ['get', 'ref'], ' ', ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name'], '']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'symbol-placement': 'line',
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
        },
        'paint': {
          'text-color': NIMIQ_COLORS.neutral700,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 2,
        },
      },

      // Airport labels
      {
        'id': 'aerodrome_label',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'aerodrome_label',
        'minzoom': 9,
        'layout': {
          'text-field': ['concat', ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']], '\n', ['upcase', ['get', 'iata']]],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
        },
        'paint': {
          'text-color': NIMIQ_COLORS.neutral700,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },

      // Mountain peaks
      {
        'id': 'mountain_peak',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'mountain_peak',
        'filter': ['>', ['coalesce', ['get', 'rank'], 99], 0],
        'minzoom': 11,
        'layout': {
          'text-field': ['concat', ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']], '\n', ['get', 'ele'], 'm'],
          'text-font': ['Noto Sans Italic'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
        },
        'paint': {
          'text-color': NIMIQ_COLORS.neutral600,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },

      // Place labels (country, city, town, village) - BEFORE location layers
      {
        'id': 'place_country',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'place',
        'filter': ['==', 'class', 'country'],
        'minzoom': 3,
        'maxzoom': 8,
        'layout': {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 8, 14],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.1,
        },
        'paint': {
          'text-color': NIMIQ_COLORS.neutral600,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },
      {
        'id': 'place_city',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'place',
        'filter': ['in', 'class', 'city', 'town'],
        'minzoom': 4,
        'layout': {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 9, 8, 11, 12, 13, 16, 16],
          'text-anchor': 'center',
        },
        'paint': {
          'text-color': NIMIQ_COLORS.neutral700,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },
      {
        'id': 'place_village',
        'type': 'symbol',
        'source': 'openmaptiles',
        'source-layer': 'place',
        'filter': ['==', 'class', 'village'],
        'minzoom': 12,
        'layout': {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 12, 9, 16, 11],
          'text-anchor': 'center',
        },
        'paint': {
          'text-color': NIMIQ_COLORS.neutral600,
          'text-halo-color': NIMIQ_COLORS.white,
          'text-halo-width': 1.5,
        },
      },

      // Cluster circles (for 50+ locations in same area)
      {
        'id': 'location-clusters',
        'type': 'circle',
        'source': 'locations',
        'source-layer': 'locations',
        'filter': ['has', 'point_count'],
        'minzoom': 6,
        'maxzoom': 9, // Hide clusters above zoom 8
        'paint': {
          'circle-color': NIMIQ_COLORS.white,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15, // 50-99 locations
            100,
            18, // 100-499 locations
            500,
            22, // 500+ locations
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(31, 35, 72, 0.05)',
        },
      },
      // Cluster count labels
      {
        'id': 'location-cluster-count',
        'type': 'symbol',
        'source': 'locations',
        'source-layer': 'locations',
        'filter': ['has', 'point_count'],
        'minzoom': 6,
        'maxzoom': 9, // Hide cluster labels above zoom 8
        'layout': {
          'text-field': ['get', 'point_count'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        'paint': {
          'text-color': NIMIQ_COLORS.darkblue,
        },
      },

    ],
  }
}

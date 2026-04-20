const MAP_HASH_PATTERN = /^#@(-?\d+(?:\.\d*)?),(-?\d+(?:\.\d*)?),(\d+(?:\.\d*)?)z(?:,(\d+(?:\.\d*)?)b)?(?:,(\d+(?:\.\d*)?)p)?/
const TRAILING_ZEROES_PATTERN = /\.?0+$/

export interface MapHashParams {
  lat?: number
  lng?: number
  zoom?: number
  bearing?: number
  pitch?: number
}

export function parseMapHash(hash: string): MapHashParams {
  const match = hash.match(MAP_HASH_PATTERN)
  if (!match || !match[1] || !match[2] || !match[3])
    return {}
  return {
    lat: Number.parseFloat(match[1]),
    lng: Number.parseFloat(match[2]),
    zoom: Number.parseFloat(match[3]),
    bearing: match[4] ? Number.parseFloat(match[4]) : undefined,
    pitch: match[5] ? Number.parseFloat(match[5]) : undefined,
  }
}

export function buildMapHash(lat: number, lng: number, zoom: number, bearing?: number, pitch?: number): string {
  const latStr = lat.toFixed(5)
  const lngStr = lng.toFixed(5)
  const zoomStr = zoom.toFixed(2).replace(TRAILING_ZEROES_PATTERN, '')
  let hash = `#@${latStr},${lngStr},${zoomStr}z`
  if (bearing && bearing !== 0)
    hash += `,${bearing.toFixed(0)}b`
  if (pitch && pitch !== 0)
    hash += `,${pitch.toFixed(0)}p`
  return hash
}

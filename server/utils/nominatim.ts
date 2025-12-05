interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  type: string
  category: string
  name: string
  addresstype: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    country?: string
  }
}

const ALLOWED_TYPES = new Set([
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'administrative',
  'suburb',
  'neighbourhood',
  'borough',
  'state',
  'country',
  'region',
  'county',
  'house',
  'building',
  'residential',
  'street',
])

function getGeoType(result: NominatimResult): GeoType {
  if (result.address.house_number || result.addresstype === 'house' || result.addresstype === 'building')
    return 'address'
  if (['state', 'country', 'region', 'county', 'administrative'].includes(result.addresstype))
    return 'region'
  return 'city'
}

function formatDisplayName(result: NominatimResult): string {
  const parts: string[] = []
  const addr = result.address

  if (addr.house_number && addr.road)
    parts.push(`${addr.road} ${addr.house_number}`)
  else if (addr.road)
    parts.push(addr.road)

  const locality = addr.city || addr.town || addr.village || addr.municipality
  if (locality && !parts.includes(locality))
    parts.push(locality)

  // Use first country name only (handles "Schweiz/Suisse/Svizzera" -> "Schweiz")
  if (addr.country)
    parts.push(addr.country.split('/')[0]!.trim())

  return parts.length > 0 ? parts.join(', ') : result.display_name
}

function formatName(result: NominatimResult): string {
  const addr = result.address
  if (addr.house_number && addr.road)
    return `${addr.road} ${addr.house_number}`
  return result.name || addr.city || addr.town || addr.village || result.display_name.split(',')[0] || ''
}

export async function searchNominatim(query: string, options?: { lat?: number, lng?: number, limit?: number }): Promise<GeoResult[]> {
  const { lat, lng, limit = 3 } = options ?? {}

  const params = new URLSearchParams({
    'q': query,
    'format': 'jsonv2',
    'limit': String(limit),
    'addressdetails': '1',
    'accept-language': 'en',
  })

  if (lat !== undefined && lng !== undefined) {
    params.set('lat', String(lat))
    params.set('lon', String(lng))
  }

  const url = `https://nominatim.openstreetmap.org/search?${params}`

  try {
    const results = await $fetch<NominatimResult[]>(url, {
      headers: { 'User-Agent': 'CryptoMapApp/1.0' },
    })

    return results
      .filter(r => ALLOWED_TYPES.has(r.addresstype) || ALLOWED_TYPES.has(r.type))
      .map(r => ({
        kind: 'geo' as const,
        name: formatName(r),
        displayName: formatDisplayName(r),
        latitude: Number.parseFloat(r.lat),
        longitude: Number.parseFloat(r.lon),
        geoType: getGeoType(r),
      }))
  }
  catch {
    return []
  }
}

// Detect if query looks like a geographic search
export function isLikelyGeoQuery(query: string): boolean {
  const q = query.toLowerCase().trim()
  // Starts with number (address)
  if (/^\d/.test(q))
    return true
  // Multiple words (likely address or "city, country")
  if (q.split(/[\s,]+/).filter(Boolean).length >= 2)
    return true
  return false
}

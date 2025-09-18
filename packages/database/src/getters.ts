import type { FeatureCollection } from 'geojson'
import type { Args, DatabaseAnonArgs, DatabaseArgs, DatabaseAuthArgs, DatabaseAuthenticateUserArgs, MapLocation, Returns } from '../../types/src/index.ts'
import { AnonReadDbFunction, AnyUserReadDbFunction, AuthReadDbFunction, Category, Cryptocity, Currency, DEFAULT_DATASET_ID, DatabaseUser, Provider } from '../../types/src/index.ts'
import { fetchDb } from './fetch.ts'
import { authenticateUser } from './auth.ts'

/**
 * We hardcode these values here, because they are rarely updated.
 * Even if we update those values in the database, we always need to update UI regardless.
 */
export const CURRENCIES = Object.values(Currency)
export const CATEGORIES = Object.values(Category)
export const PROVIDERS = Object.values(Provider)
export const CRYPTOCITIES = Object.values(Cryptocity)

// Maximum number of rows from the database
const MAX_N_ROWS = 1000

export async function getLocations(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  { boundingBox, datasetId = DEFAULT_DATASET_ID }: Args[AnonReadDbFunction.GetLocations],
  parseLocations: (l: MapLocation) => MapLocation = l => l,
): Promise<MapLocation[]> {
  const { neLat, neLng, swLat, swLng } = boundingBox
  const query = new URLSearchParams({
    nelat: neLat.toString(),
    nelng: neLng.toString(),
    swlat: swLat.toString(),
    swlng: swLng.toString(),
  })

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  let page = 1
  const locations: MapLocation[] = []
  do {
    query.set('page_num', (page++).toString())
    locations.push(...await fetchDb<MapLocation[]>(AnonReadDbFunction.GetLocations, dbArgs, { query }) ?? [])
  } while (locations.length > 0 && locations.length % MAX_N_ROWS === 0)
  return locations.map(parseLocations)
}

export async function getLocation(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  { uuid, datasetId = DEFAULT_DATASET_ID }: Args[AnonReadDbFunction.GetLocation],
  parseLocation: (l: MapLocation) => MapLocation,
): Promise<MapLocation | undefined> {
  const query = new URLSearchParams()
  query.append('location_uuid', uuid)

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  const location = await fetchDb<MapLocation>(AnonReadDbFunction.GetLocation, dbArgs, { query })
  if (!location) {
    console.warn(`MapLocation ${uuid} not found`)
    return undefined
  }
  return parseLocation(location)
}

export async function searchLocations(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  { query: queryInput, datasetId = DEFAULT_DATASET_ID }: Args[AnonReadDbFunction.SearchLocations],
) {
  const query = new URLSearchParams()
  query.append('p_query', queryInput)

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  type AutocompleteDatabase = { label: string, id: string, matchedSubstrings: { length: number, offset: number }[] }[]
  const res = await fetchDb<AutocompleteDatabase>(AnonReadDbFunction.SearchLocations, dbArgs, { query }) ?? []
  return res.map(r => ({ name: r.label, matchedSubstrings: r.matchedSubstrings, uuid: r.id }))
}

export async function searchCryptocities(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  queryInput: string,
  datasetId: string = DEFAULT_DATASET_ID,
) {
  const query = new URLSearchParams()
  query.append('p_query', queryInput)

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  type CryptocitiesDatabase = { label: string, city_id: string, matchedSubstrings: { length: number, offset: number }[], lat: number, lng: number, zoom_level: number }[]

  const res = (await fetchDb<CryptocitiesDatabase>(AnonReadDbFunction.SearchCryptocities, dbArgs, { query })) ?? []
  return res.map(r => ({
    name: r.label,
    matchedSubstrings: r.matchedSubstrings,
    id: r.city_id,
    lat: r.lat,
    lng: r.lng,
    zoom: r.zoom_level,
  }))
}

export async function getMarkers(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  { boundingBox: { neLat, neLng, swLat, swLng }, zoom, datasetId = DEFAULT_DATASET_ID }: Args[AnonReadDbFunction.GetMarkers],
  parseLocation: (l: MapLocation) => MapLocation = l => l,
): Promise<Returns[AnonReadDbFunction.GetMarkers]> {
  const query = new URLSearchParams({
    nelat: neLat.toString(),
    nelng: neLng.toString(),
    swlat: swLat.toString(),
    swlng: swLng.toString(),
    zoom_level: zoom.toString(),
  })

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  const res = await fetchDb<Returns[AnonReadDbFunction.GetMarkers]>(AnonReadDbFunction.GetMarkers, dbArgs, { query })
  return {
    clusters: res?.clusters ?? [],
    singles: res?.singles.filter(Boolean).map(parseLocation) ?? [],
  }
}

/**
 * The maximum zoom level at which the clusters are computed in the database.
 * If the user zooms in more than this, the clusters will be computed in the client.
 */
export async function getClusterMaxZoom(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  datasetId: string = DEFAULT_DATASET_ID,
) {
  const query = new URLSearchParams()

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  return await fetchDb<number>(AnonReadDbFunction.GetMaxZoom, dbArgs, { query }) ?? -1 // FIXME: Show error to user instead of using -1
}

export async function getCryptocityPolygon(dbArgs: DatabaseAuthArgs | DatabaseAnonArgs, city: Cryptocity): Promise<FeatureCollection | undefined> {
  return await fetchDb<FeatureCollection>(AnonReadDbFunction.GetCryptocityPolygon, dbArgs, { query: new URLSearchParams({ city }) })
}

export async function getCryptocities(
  dbArgs: DatabaseAuthArgs | DatabaseAnonArgs,
  { boundingBox: { neLat, neLng, swLat, swLng }, excludedCities, datasetId = DEFAULT_DATASET_ID }: Args[AnonReadDbFunction.GetCryptocities],
) {
  const query = new URLSearchParams({
    nelat: neLat.toString(),
    nelng: neLng.toString(),
    swlat: swLat.toString(),
    swlng: swLng.toString(),
  })

  excludedCities.forEach(city => query.append('excluded_cities', city))
  query.append('excluded_cities', `{${excludedCities.join(',')}}`)

  // Add dataset parameter to query if provided
  if (datasetId)
    query.append('p_dataset_id', datasetId)

  const res = await fetchDb<Returns[AnonReadDbFunction.GetCryptocities]>(AnonReadDbFunction.GetCryptocities, dbArgs, { query })
  return res?.map((cryptocity) => {
    const locationsCount = (cryptocity as any).locations_count as string
    const showCardAtZoom = (cryptocity as any).show_card_at_zoom as string
    return { ...cryptocity, locationsCount: Number.parseInt(locationsCount), showCardAtZoom: Number.parseInt(showCardAtZoom), locations_count: undefined, show_card_at_zoom: undefined }
  })
}

export async function getStats(dbArgs: DatabaseAuthArgs | DatabaseAuthenticateUserArgs) {
  return await fetchDb<Returns[AuthReadDbFunction.GetStats]>(AuthReadDbFunction.GetStats, await authenticateUser(dbArgs))
}

export async function getTimestamps(dbArgs: DatabaseArgs) {
  return await fetchDb<Returns[AnyUserReadDbFunction.GetTimestamps]>(AnyUserReadDbFunction.GetTimestamps, { ...dbArgs, user: DatabaseUser.Any })
}

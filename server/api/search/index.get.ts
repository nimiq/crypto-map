import type { SearchLocationResponse } from '../../../shared/types'
import { consola } from 'consola'
import * as v from 'valibot'
import { filterOpenNow } from '~~/server/utils/open-now'

const querySchema = v.object({
  lat: v.optional(v.pipe(
    v.string(),
    v.transform(Number),
    v.number('Latitude must be a number'),
    v.minValue(-90, 'Latitude must be >= -90'),
    v.maxValue(90, 'Latitude must be <= 90'),
  )),
  lng: v.optional(v.pipe(
    v.string(),
    v.transform(Number),
    v.number('Longitude must be a number'),
    v.minValue(-180, 'Longitude must be >= -180'),
    v.maxValue(180, 'Longitude must be <= 180'),
  )),
  q: v.optional(v.string()),
  openNow: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
  walkable: v.optional(v.pipe(v.string(), v.transform(val => val === 'true'))),
})

export default defineEventHandler(async (event) => {
  const { q: searchQuery, openNow = false, walkable = false, lat: qLat, lng: qLng } = await getValidatedQuery(event, data => v.parse(querySchema, data))
  if (!searchQuery || searchQuery.trim().length === 0)
    return []

  const { lat, lng } = (!qLat || !qLng)
    ? await locateByHost(getHeader(event, 'cf-connecting-ip')).catch(() => ({ lat: undefined, lng: undefined }))
    : { lat: qLat, lng: qLng }

  if (lat !== undefined && lng !== undefined)
    consola.info(`User location: ${lat}, ${lng}`, { tag: 'geolocation' })

  // Hybrid search: fast text search + smart semantic matching
  const [textResults, similarCategories] = await Promise.all([
    searchLocationsByText(searchQuery),
    searchSimilarCategories(searchQuery),
  ])
  const categoryResults = await searchLocationsByCategories(similarCategories)

  // Text results prioritized - they appear first in the list
  const combinedMap = new Map<string, SearchLocationResponse>()

  for (const loc of textResults) {
    combinedMap.set(loc.uuid, loc)
  }

  // Category results added only if not already matched by text search
  for (const loc of categoryResults) {
    if (!combinedMap.has(loc.uuid))
      combinedMap.set(loc.uuid, loc)
  }

  let searchResults = Array.from(combinedMap.values())

  // Apply walkable distance filter if requested and user location is available
  if (walkable && lat !== undefined && lng !== undefined)
    searchResults = filterByWalkableDistance(searchResults, lat, lng)

  return openNow ? filterOpenNow(searchResults) : searchResults
})

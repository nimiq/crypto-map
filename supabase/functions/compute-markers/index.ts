/* eslint-disable no-console */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { authenticateUser } from '../../../database/auth.ts'
import { flushMarkersTable, insertMarkers } from '../../../database/functions.ts'
import { getCryptocities, getLocations } from '../../../database/getters.ts'
import { algorithm, computeMarkers } from '../../../shared/compute-markers.ts'
import type { Args, AuthWriteDbFunction } from '../../../types/database.ts'
import type { BoundingBox } from '../../../types/index.ts'
import { euclideanDistance } from '../../../shared/geo-utils.ts'

async function cluster() {
  const url = Deno.env.get('SUPABASE_URL')
  const apikey = Deno.env.get('SUPABASE_ANON_KEY')
  const email = Deno.env.get('DB_AUTH_EMAIL')
  const password = Deno.env.get('DB_AUTH_PASSWORD')
  const minZoom = Number(Deno.env.get('MIN_ZOOM')) || 3
  const maxZoom = Number(Deno.env.get('MAX_ZOOM')) || 14

  if (!apikey || !url || !email || !password) {
    console.log({ apikey, url, email, password })
    throw new Error('Missing environment variables')
  }

  const dbArgs = await authenticateUser({ apikey, url, auth: { email, password } })

  console.log('Flushing cluster table...')
  await flushMarkersTable(dbArgs)

  const boundingBox: BoundingBox = { neLat: 90, neLng: 180, swLat: -90, swLng: -180 }

  const locations = await getLocations(dbArgs, boundingBox)
  console.log(`Found ${locations.length} locations`)

  type Radii = Record<number /* minZoom, maxZoom */, number /* the radius for minZoom is 120, the radius for maxZoom is 150 */>
  const radii: Radii = Array.from({ length: maxZoom - minZoom + 1 }, (_, i) => 120 + i * 30 / (maxZoom - minZoom))
    .reduce((acc, radius, i) => ({ ...acc, [minZoom + i]: radius }), {})

  console.log('Computing clusters...')

  const promises: Promise<unknown>[] = []

  const cryptocities = await getCryptocities(dbArgs, { boundingBox, excludedCities: [] })
  if (!cryptocities || cryptocities.length === 0)
    throw new Error('No cryptocities found')

  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    const { singles, clusters: locationClusters } = computeMarkers(algorithm(radii[zoom]), locations, { zoom, boundingBox })

    const singlesToAdd: Args[AuthWriteDbFunction.InsertMarkers]['items'] = singles.map(({ lng, lat, uuid }) => ({ lat, lng, count: 1, locationUuid: uuid }))

    const clustersWithCryptocurrencies = [...locationClusters, ...cryptocities]
    const { singles: singlesItems, clusters: cryptocitiesClustered } = computeMarkers(algorithm(radii[zoom]), clustersWithCryptocurrencies, { zoom, boundingBox })

    const singlesCryptocities: Args[AuthWriteDbFunction.InsertMarkers]['items']
      = (singlesItems.filter(c => 'city' in c) as typeof cryptocities)
        .map(({ lng, lat, city }) => ({ lat, lng, count: 1, cryptocities: [city] }))

    for (const cryptocityClustered of cryptocitiesClustered.filter(c => c.count > 1)) {
      const closestClusterId = locationClusters
        .map(cluster => ({ ...cluster, distance: euclideanDistance(cluster, cryptocityClustered) }))
        .sort((a, b) => a.distance - b.distance)[0].id
      const closestCluster = locationClusters.find(c => c.id === closestClusterId)
      if (!closestCluster)
        return

      closestCluster.cryptocities = cryptocities
        .map(cryptocity => ({ city: cryptocity.city, distance: euclideanDistance(cryptocity, cryptocityClustered) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, cryptocityClustered.count - 1)
        .map(({ city }) => city)
    }

    promises.push(insertMarkers(dbArgs, { zoom_level: zoom, items: singlesToAdd.concat(locationClusters).concat(singlesCryptocities) }))

    console.log(`Added ${locationClusters.length} clusters and ${singles.length} singles at zoom level ${zoom}`)
  }

  await Promise.allSettled(promises)

  console.log('Done')
}

serve(async () => {
  try {
    console.log('Starting clustering...')
    await cluster()
    return new Response(undefined, { status: 201 })
  }
  catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

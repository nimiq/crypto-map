/// <reference lib="deno.ns" />

/* eslint-disable no-console */

import { flushClusterTable, insertLocationsClusterSet } from '../../../database/functions.ts'
import { getLocations } from '../../../database/getters.ts'
import { algorithm, computeCluster } from '../../../shared/compute-cluster.ts'
import type { DatabaseAuthArgs, InsertLocationsClustersSetParamsItem } from '../../../types/database.ts'
import type { BoundingBox, Cluster, Location } from '../../../types/index.ts'

const apikey = Deno.env.get('SUPABASE_ANON_KEY')
const url = Deno.env.get('SUPABASE_URL')
const email = Deno.env.get('DB_AUTH_EMAIL')
const password = Deno.env.get('DB_AUTH_PASSWORD')

if (!apikey || !url || !email || !password) {
  console.log({ apikey, url, email, password })
  throw new Error('Missing environment variables')
}

const dbArgs: DatabaseAuthArgs = {
  apikey,
  url,
  auth: {
    email,
    password,
  },
}

await flushClusterTable(dbArgs)

const bbox: BoundingBox = { neLat: 90, neLng: 180, swLat: -90, swLng: -180 }
const locations = await getLocations(dbArgs, bbox)

const minZoom = Number(Deno.env.get('MIN_ZOOM'))
const maxZoom = Number(Deno.env.get('MAX_ZOOM'))

for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
  const res = computeCluster(algorithm, locations, { zoom, boundingBox: bbox })
  const singles: InsertLocationsClustersSetParamsItem[] = (res.singles as Location[]).map(({ lng, lat, uuid }) => ({ lat, lng, count: 1, locationUuid: uuid }))
  await insertLocationsClusterSet(dbArgs, {
    zoom_level: zoom,
    items: singles.concat(res.clusters as Cluster[]),
  })
  console.log(
    `Added ${clusters.length} clusters and ${singles.length} singles at zoom level ${zoom}`,
  )
}

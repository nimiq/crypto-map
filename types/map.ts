import type { MapViewportSchema } from '~~/lib/schemas.js'
import type { Feature, MultiPolygon } from 'geojson'
import type { InferInput } from 'valibot'
import type { Cryptocity } from './cryptocity.ts'
import type { MapLocation } from './location.ts'

export interface BoundingBox {
  swlat: number
  swlng: number
  nelat: number
  nelng: number
}

export interface Point {
  lat: number
  lng: number
}

export interface EstimatedMapPosition {
  center: Point
  accuracy: number // in meters
}

export interface MapPosition {
  center: Point
  zoom: number
}

export interface Cluster {
  id: number // Used for optimization in the rendering process
  lng: number
  lat: number
  expansionZoom: number // The new zoom when the cluster is expanded
  count: number
  diameter: number
  cryptocities: Cryptocity[]
}

export type MapViewport = InferInput<typeof MapViewportSchema>

export interface LocationClusterParams {
  zoom: number
  categories?: string
  currencies?: string
}

export interface Markers {
  clusters: Cluster[]
  singles: MapLocation[]
}

export interface MemoizedMarkers extends Markers {
  // The different areas where the clusters have been already computed
  area: Feature<MultiPolygon>
}

import bboxPolygon from '@turf/bbox-polygon'
import type { Feature, MultiPolygon } from '@turf/helpers'
import { featureCollection, multiPolygon, point } from '@turf/helpers'
import pointsWithinPolygon from '@turf/points-within-polygon'
import union from '@turf/union'
import intersect from '@turf/intersect'
import booleanWithin from '@turf/boolean-within'
import { type BoundingBox, Cryptocity, type Point } from '../types/index.ts'

/**
 * Returns a GeoJSON Point from a location. You can pass an object like a Location which will be stored as a property of the point
 * so you can retrieve it later
 */
export const toPoint = <T extends Point>(data: T) => point([data.lng, data.lat], data)

/**
 * Converts a bounding box to a GeoJSON Polygon
 *
 * It creates an array of polygons. This is just in case the bounding box crosses the antimeridian,
 * which will result in two polygons.
 */
const _toPolygon = ({ swLat, neLat, neLng, swLng }: BoundingBox) => bboxPolygon([swLng, swLat, neLng, neLat])
function toPolygon(bbox: BoundingBox) {
  return bbox.swLng > bbox.neLng ? [_toPolygon({ ...bbox, neLng: 180 }), _toPolygon({ ...bbox, swLng: -180 })] : [_toPolygon(bbox)]
}

/**
 * A mutlipolygon is a list of polygons.
 * In the following example, we have a multipolygon with two polygons:
┌───────────┐
│          │    ┌──────┐
│          └┐   │      │
│           │   └──────┘
└────────┐   │
        │   │
        └───┘
 */

/**
 * Converts a bounding box to a GeoJSON MultiPolygon
 */
export const toMultiPolygon = (bbox: BoundingBox) => multiPolygon(toPolygon(bbox).map((p => p.geometry.coordinates)))

/**
 * Checks if a bounding box is within a multipolygon.
 * Since bounding boxes can cross the antimeridian, we need to check if any of the polygons created by toPolygon
 * is within the multipolygon
 */
export function bBoxIsWithinArea(bbox: BoundingBox, area?: Feature) {
  return !area ? false : toPolygon(bbox).some(p => booleanWithin(p, area))
}

/**
 * Adds a polygon (from a bounding box) to a multipolygon
 */
export function addBBoxToArea(bbox: BoundingBox, area?: Feature<MultiPolygon>) {
  return !area ? toMultiPolygon(bbox) : union(area, toMultiPolygon(bbox)) as Feature<MultiPolygon> || area
}

/**
 * Given a list of items (anything that has {lat, lng}, e.g.: locations or clusters) and a bounding box,
 * returns the items that are within the bounding box
 *
 * 1. Split the box if we are in the antimeridian
 * 2. We create a list of points (using multiPoint) from the items
 *    - In the properties of each point, we store the items data
 * 3. We create a polygon from each of the bounding box from step 1
 * 4. We check which points are within any of the polygons
 * 5. We return the original item data from the points that are within the polygon
 */
export function getItemsWithinBBox<T extends Point>(items: T[], bbox: BoundingBox) {
  return pointsWithinPolygon(featureCollection(items.map(toPoint)), toMultiPolygon(bbox)).features.flatMap(f => f.properties)
}

/**
 * Checks if a bounding box is intersecting another bounding box.
 * Since bounding boxes can cross the antimeridian, we need to check if any of the polygons created by toPolygon
 * is within the othe multipolygon
 */
export function bBoxesIntersect(bbox1: BoundingBox, bbox2: BoundingBox) {
  const [polygon1, polygon2] = [bbox1, bbox2].map(toPolygon)
  return polygon1.some(p1 => polygon2.some(p2 => intersect(p1, p2)))
}

export function euclideanDistance({ lat: y1, lng: x1 }: Point, { lat: y2, lng: x2 }: Point) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// TODO MAybe useless funciton
export function distanceInPx({ lat: y1, lng: x1 }: Point, { lat: y2, lng: x2 }: Point, { lngInPx, latInPx }: { lngInPx: number; latInPx: number }) {
  return Math.sqrt(((x2 - x1) * lngInPx) ** 2 + ((y2 - y1) * latInPx) ** 2)
}

export const cryptocitiesCentroids: Record<Cryptocity, Point & { city: Cryptocity }> = {
  [Cryptocity.SanJose]: { lat: 9.935, lng: -84.102, city: Cryptocity.SanJose },
}

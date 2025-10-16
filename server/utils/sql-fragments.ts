/**
 * SQL Fragments Utility Module
 *
 * This module provides reusable SQL fragments and helper functions to eliminate code duplication
 * and ensure consistent behavior across all location-related API endpoints. All fragments are
 * designed to work seamlessly with Drizzle ORM's query builder and type system.
 *
 * Key features:
 * - Consistent address formatting across all endpoints
 * - Standardized coordinate extraction from PostGIS geometry
 * - Unified category aggregation with proper JSON structure
 * - Flexible distance calculations with configurable origins
 * - Category filtering with both AND and OR semantics
 * - Full TypeScript support with proper type inference
 */

import { sql } from 'drizzle-orm'
import { tables } from './drizzle'

/**
 * Coordinate type for origin parameters in distance calculations
 */
export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Address concatenation fragment that combines street, postal code, city, and country
 * into a formatted address string.
 *
 * @example
 * // Usage in a query:
 * db.select({ address }).from(tables.locations)
 */
export const address = sql<string>`${tables.locations.street} || ', ' || ${tables.locations.postalCode} || ' ' || ${tables.locations.city} || ', ' || ${tables.locations.country}`.as('address')

/**
 * Latitude extraction fragment that extracts the Y coordinate from PostGIS point geometry.
 *
 * @example
 * // Usage in a query:
 * db.select({ latitude }).from(tables.locations)
 */
export const latitude = sql<number>`ST_Y(${tables.locations.location})`.as('latitude')

/**
 * Longitude extraction fragment that extracts the X coordinate from PostGIS point geometry.
 *
 * @example
 * // Usage in a query:
 * db.select({ longitude }).from(tables.locations)
 */
export const longitude = sql<number>`ST_X(${tables.locations.location})`.as('longitude')

/**
 * Categories aggregation fragment that creates a JSON array of category objects
 * with proper handling of NULL values.
 *
 * @example
 * // Usage in a query with joins:
 * db.select({ categories: categoriesAgg })
 *   .from(tables.locations)
 *   .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
 *   .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
 *   .groupBy(tables.locations.uuid)
 */
export const categoriesAgg = sql<LocationResponse['categories']>`COALESCE(
  json_agg(
    json_build_object(
      'id', ${tables.categories.id},
      'name', ${tables.categories.name},
      'icon', ${tables.categories.icon}
    )
  ) FILTER (WHERE ${tables.categories.id} IS NOT NULL),
  '[]'
)`.as('categories')

/**
 * Distance calculation factory function that creates a SQL fragment for calculating
 * the distance in meters between a location and an origin point.
 *
 * @param origin - The origin coordinates (latitude and longitude)
 * @returns SQL fragment that calculates distance in meters
 *
 * @example
 * // Usage in a query:
 * const origin = { lat: 46.005030, lng: 8.956060 }
 * db.select({ distanceMeters: distance(origin) }).from(tables.locations)
 */
export function distance(origin: Coordinates) {
  return sql<number>`ST_Distance(
    ${tables.locations.location}::geography,
    ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography
  )`.as('distanceMeters')
}

/**
 * Geospatial filter factory function that creates a WHERE condition for locations
 * within a specified distance from an origin point.
 *
 * @param origin - The origin coordinates (latitude and longitude)
 * @param maxDistanceMeters - Maximum distance in meters
 * @returns SQL fragment for use in WHERE clauses
 *
 * @example
 * // Usage in a query:
 * const origin = { lat: 46.005030, lng: 8.956060 }
 * db.select().from(tables.locations)
 *   .where(withinDistance(origin, 1000)) // Within 1km
 */
export function withinDistance(origin: Coordinates, maxDistanceMeters: number) {
  return sql`ST_DWithin(
    ${tables.locations.location}::geography,
    ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
    ${maxDistanceMeters}
  )`
}

/**
 * Category filter helper with AND semantics - locations must match ALL specified categories.
 * Use this when you need locations that have multiple specific categories.
 *
 * @param categories - Array of category IDs that locations must have
 * @returns SQL fragment for use in WHERE clauses
 *
 * @example
 * // Usage in a query:
 * db.select().from(tables.locations)
 *   .where(categoryFilter(['restaurant', 'outdoor_seating'])) // Must be restaurant AND have outdoor seating
 */
export function categoryFilter(categories: string[]) {
  if (!categories || categories.length === 0) {
    return sql`TRUE` // No-op condition
  }

  // AND semantics: location must have ALL specified categories
  const subqueries = categories.map(categoryId =>
    sql`EXISTS (
      SELECT 1 FROM ${tables.locationCategories} 
      WHERE ${tables.locationCategories.locationUuid} = ${tables.locations.uuid} 
      AND ${tables.locationCategories.categoryId} = ${categoryId}
    )`,
  )

  return sql.join(subqueries, sql` AND `)
}

/**
 * Category filter helper with OR semantics - locations must match ANY of the specified categories.
 * Use this for search functionality and contextual carousels where you want to show
 * locations that match any of the related categories.
 *
 * @param categories - Array of category IDs that locations can have
 * @returns SQL fragment for use in WHERE clauses
 *
 * @example
 * // Usage in a query:
 * db.select().from(tables.locations)
 *   .where(categoryFilterOr(['restaurant', 'cafe', 'bakery'])) // Morning food options
 */
export function categoryFilterOr(categories: string[]) {
  if (!categories || categories.length === 0) {
    return sql`TRUE`
  }

  const categoryConditions = categories.map(cat =>
    sql`${tables.locationCategories.categoryId} = ${cat}`,
  )

  return sql`${tables.locations.uuid} IN (
    SELECT ${tables.locationCategories.locationUuid}
    FROM ${tables.locationCategories}
    WHERE ${sql.join(categoryConditions, sql` OR `)}
  )`
}

/**
 * Base location select object using SQL fragments for consistent data formatting.
 * This replaces the inline locationSelect objects used throughout the codebase.
 *
 * @example
 * // Usage in a query:
 * db.select(baseLocationSelect)
 *   .from(tables.locations)
 *   .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
 *   .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
 *   .groupBy(tables.locations.uuid)
 */
export const baseLocationSelect = {
  uuid: tables.locations.uuid,
  name: tables.locations.name,
  address,
  latitude,
  longitude,
  rating: tables.locations.rating,
  photo: tables.locations.photo,
  gmapsPlaceId: tables.locations.gmapsPlaceId,
  gmapsUrl: tables.locations.gmapsUrl,
  website: tables.locations.website,
  source: tables.locations.source,
  timezone: tables.locations.timezone,
  openingHours: tables.locations.openingHours,
  createdAt: tables.locations.createdAt,
  updatedAt: tables.locations.updatedAt,
  categories: categoriesAgg,
}

/**
 * Extended location select factory function that includes distance calculation.
 *
 * @param origin - The origin coordinates for distance calculation
 * @returns Select object with all base fields plus distance
 *
 * @example
 * // Usage in a query:
 * const origin = { lat: 46.005030, lng: 8.956060 }
 * db.select(locationSelectWithDistance(origin))
 *   .from(tables.locations)
 *   .leftJoin(tables.locationCategories, eq(tables.locations.uuid, tables.locationCategories.locationUuid))
 *   .leftJoin(tables.categories, eq(tables.locationCategories.categoryId, tables.categories.id))
 *   .groupBy(tables.locations.uuid)
 */
export function locationSelectWithDistance(origin: Coordinates) {
  return {
    ...baseLocationSelect,
    distanceMeters: distance(origin),
  }
}

/**
 * Location count fragment for counting the number of unique locations associated with a category.
 * Uses DISTINCT to ensure each location is counted only once per category.
 *
 * @example
 * // Usage in a query:
 * db.select({ locationCount }).from(tables.categories)
 *   .leftJoin(tables.locationCategories, categoryLocationJoin)
 *   .groupBy(tables.categories.id)
 */
export const locationCount = sql<number>`count(DISTINCT ${tables.locationCategories.locationUuid})::int`.as('locationCount')

/**
 * Category-location join condition fragment for consistent joining between
 * categories and locationCategories tables.
 *
 * @example
 * // Usage in a query:
 * db.select().from(tables.categories)
 *   .leftJoin(tables.locationCategories, categoryLocationJoin)
 */
export const categoryLocationJoin = sql`${tables.categories.id} = ${tables.locationCategories.categoryId}`

// Type exports for better TypeScript support
export type AddressFragment = typeof address
export type LatitudeFragment = typeof latitude
export type LongitudeFragment = typeof longitude
export type CategoriesFragment = typeof categoriesAgg
export type DistanceFragment = ReturnType<typeof distance>
export type LocationCountFragment = typeof locationCount
export type CategoryLocationJoinFragment = typeof categoryLocationJoin
export type BaseLocationSelect = typeof baseLocationSelect
export type LocationSelectWithDistance = ReturnType<typeof locationSelectWithDistance>

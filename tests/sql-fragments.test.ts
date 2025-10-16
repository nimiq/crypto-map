import type { Coordinates } from '../server/utils/sql-fragments'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  address,
  baseLocationSelect,
  categoriesAgg,
  categoryFilter,
  categoryFilterOr,
  distance,
  latitude,
  locationSelectWithDistance,
  longitude,
  withinDistance,

} from '../server/utils/sql-fragments'

describe('sQL Fragments', () => {
  describe('address fragment', () => {
    it('should be an aliased SQL fragment', () => {
      expect(address).toBeDefined()
      expect(address.fieldAlias).toBe('address')
      expect(address.sql).toBeDefined()
    })
  })

  describe('latitude fragment', () => {
    it('should be an aliased SQL fragment', () => {
      expect(latitude).toBeDefined()
      expect(latitude.fieldAlias).toBe('latitude')
      expect(latitude.sql).toBeDefined()
    })
  })

  describe('longitude fragment', () => {
    it('should be an aliased SQL fragment', () => {
      expect(longitude).toBeDefined()
      expect(longitude.fieldAlias).toBe('longitude')
      expect(longitude.sql).toBeDefined()
    })
  })

  describe('categoriesAgg fragment', () => {
    it('should be an aliased SQL fragment', () => {
      expect(categoriesAgg).toBeDefined()
      expect(categoriesAgg.fieldAlias).toBe('categories')
      expect(categoriesAgg.sql).toBeDefined()
    })
  })

  describe('distance factory function', () => {
    const testOrigin: Coordinates = { lat: 46.005030, lng: 8.956060 }

    it('should generate distance fragment with valid coordinates', () => {
      const fragment = distance(testOrigin)
      expect(fragment).toBeDefined()
      expect(fragment.fieldAlias).toBe('distanceMeters')
      expect(fragment.sql).toBeDefined()
    })

    it('should handle different coordinate values', () => {
      const origins = [
        { lat: 0, lng: 0 },
        { lat: -90, lng: -180 },
        { lat: 90, lng: 180 },
        { lat: 46.005030, lng: 8.956060 },
      ]

      origins.forEach((origin) => {
        const fragment = distance(origin)
        expect(fragment).toBeDefined()
        expect(fragment.fieldAlias).toBe('distanceMeters')
      })
    })

    it('should handle decimal coordinates', () => {
      const origin = { lat: 46.123456789, lng: 8.987654321 }
      const fragment = distance(origin)
      expect(fragment).toBeDefined()
      expect(fragment.fieldAlias).toBe('distanceMeters')
    })
  })

  describe('withinDistance factory function', () => {
    const testOrigin: Coordinates = { lat: 46.005030, lng: 8.956060 }

    it('should generate geospatial filter with valid parameters', () => {
      const fragment = withinDistance(testOrigin, 1000)
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should handle different distance values', () => {
      const distances = [100, 1000, 5000, 10000]

      distances.forEach((maxDistance) => {
        const fragment = withinDistance(testOrigin, maxDistance)
        expect(fragment).toBeDefined()
      })
    })

    it('should handle zero distance', () => {
      const fragment = withinDistance(testOrigin, 0)
      expect(fragment).toBeDefined()
    })
  })

  describe('categoryFilter function (AND semantics)', () => {
    it('should handle empty category array', () => {
      const fragment = categoryFilter([])
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should handle null/undefined categories', () => {
      const fragment1 = categoryFilter(null as any)
      const fragment2 = categoryFilter(undefined as any)
      expect(fragment1).toBeDefined()
      expect(fragment2).toBeDefined()
    })

    it('should generate fragment for single category', () => {
      const fragment = categoryFilter(['restaurant'])
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should generate fragment for multiple categories', () => {
      const fragment = categoryFilter(['restaurant', 'cafe', 'bar'])
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should handle special characters in category IDs', () => {
      const categories = ['category-with-dash', 'category_with_underscore', 'category.with.dots']
      const fragment = categoryFilter(categories)
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })
  })

  describe('categoryFilterOr function (OR semantics)', () => {
    it('should handle empty category array', () => {
      const fragment = categoryFilterOr([])
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should handle null/undefined categories', () => {
      const fragment1 = categoryFilterOr(null as any)
      const fragment2 = categoryFilterOr(undefined as any)
      expect(fragment1).toBeDefined()
      expect(fragment2).toBeDefined()
    })

    it('should generate fragment for single category', () => {
      const fragment = categoryFilterOr(['restaurant'])
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should generate fragment for multiple categories', () => {
      const fragment = categoryFilterOr(['restaurant', 'cafe', 'bar'])
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })

    it('should handle special characters in category IDs', () => {
      const categories = ['category-with-dash', 'category_with_underscore', 'category.with.dots']
      const fragment = categoryFilterOr(categories)
      expect(fragment).toBeDefined()
      expect(fragment.queryChunks).toBeDefined()
    })
  })

  describe('baseLocationSelect object', () => {
    it('should contain all required location fields', () => {
      const select = baseLocationSelect

      // Check that all expected fields are present
      expect(select.uuid).toBeDefined()
      expect(select.name).toBeDefined()
      expect(select.address).toBeDefined()
      expect(select.latitude).toBeDefined()
      expect(select.longitude).toBeDefined()
      expect(select.rating).toBeDefined()
      expect(select.photo).toBeDefined()
      expect(select.gmapsPlaceId).toBeDefined()
      expect(select.gmapsUrl).toBeDefined()
      expect(select.website).toBeDefined()
      expect(select.source).toBeDefined()
      expect(select.timezone).toBeDefined()
      expect(select.openingHours).toBeDefined()
      expect(select.createdAt).toBeDefined()
      expect(select.updatedAt).toBeDefined()
      expect(select.categories).toBeDefined()
    })

    it('should use SQL fragments for computed fields', () => {
      const select = baseLocationSelect

      // Address should be the address fragment
      expect(select.address).toBe(address)
      expect(select.latitude).toBe(latitude)
      expect(select.longitude).toBe(longitude)
      expect(select.categories).toBe(categoriesAgg)
    })
  })

  describe('locationSelectWithDistance factory function', () => {
    const testOrigin: Coordinates = { lat: 46.005030, lng: 8.956060 }

    it('should include all base location fields', () => {
      const select = locationSelectWithDistance(testOrigin)

      // Should have all base fields
      Object.keys(baseLocationSelect).forEach((key) => {
        expect(select[key as keyof typeof select]).toBeDefined()
      })
    })

    it('should add distanceMeters field', () => {
      const select = locationSelectWithDistance(testOrigin)
      expect(select.distanceMeters).toBeDefined()

      // Should be a distance fragment
      const distanceFragment = select.distanceMeters
      expect(distanceFragment.fieldAlias).toBe('distanceMeters')
    })

    it('should handle different origin coordinates', () => {
      const origins = [
        { lat: 0, lng: 0 },
        { lat: 46.005030, lng: 8.956060 },
        { lat: -45.123, lng: 170.456 },
      ]

      origins.forEach((origin) => {
        const select = locationSelectWithDistance(origin)
        expect(select.distanceMeters).toBeDefined()
        expect(select.distanceMeters.fieldAlias).toBe('distanceMeters')
      })
    })
  })

  describe('functional behavior tests', () => {
    it('should create valid SQL fragments that can be used in queries', () => {
      // Test that fragments can be combined with other SQL
      const testQuery = sql`SELECT ${address}, ${latitude}, ${longitude} FROM locations`
      expect(testQuery).toBeDefined()
      expect(testQuery.queryChunks).toBeDefined()
    })

    it('should create category filters that return valid SQL', () => {
      const andFilter = categoryFilter(['restaurant', 'cafe'])
      const orFilter = categoryFilterOr(['restaurant', 'cafe'])

      // Both should be valid SQL fragments
      expect(andFilter).toBeDefined()
      expect(orFilter).toBeDefined()

      // Should be able to use in WHERE clauses
      const testQuery1 = sql`SELECT * FROM locations WHERE ${andFilter}`
      const testQuery2 = sql`SELECT * FROM locations WHERE ${orFilter}`

      expect(testQuery1).toBeDefined()
      expect(testQuery2).toBeDefined()
    })

    it('should create distance functions that return valid SQL', () => {
      const origin = { lat: 46.005030, lng: 8.956060 }
      const distanceFragment = distance(origin)
      const withinFragment = withinDistance(origin, 1000)

      // Should be able to use in SELECT and WHERE clauses
      const testQuery = sql`SELECT ${distanceFragment} FROM locations WHERE ${withinFragment}`
      expect(testQuery).toBeDefined()
    })
  })
})

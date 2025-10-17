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
  describe('basic fragments', () => {
    it('should export valid SQL fragments', () => {
      // Test that all fragments are defined and can be used in queries
      expect(address).toBeDefined()
      expect(latitude).toBeDefined()
      expect(longitude).toBeDefined()
      expect(categoriesAgg).toBeDefined()

      // Test that they can be used in SQL queries without throwing
      expect(() => sql`SELECT ${address}`).not.toThrow()
      expect(() => sql`SELECT ${latitude}`).not.toThrow()
      expect(() => sql`SELECT ${longitude}`).not.toThrow()
      expect(() => sql`SELECT ${categoriesAgg}`).not.toThrow()
    })

    it('should be usable in combined queries', () => {
      expect(() => {
        sql`SELECT ${address}, ${latitude}, ${longitude}, ${categoriesAgg} FROM locations`
      }).not.toThrow()
    })
  })

  describe('distance factory function', () => {
    const testOrigin: Coordinates = { lat: 46.005030, lng: 8.956060 }

    it('should generate valid distance fragments', () => {
      const fragment = distance(testOrigin)
      expect(fragment).toBeDefined()
      expect(() => sql`SELECT ${fragment}`).not.toThrow()
    })

    it('should handle different coordinate values', () => {
      const origins = [
        { lat: 0, lng: 0 },
        { lat: -90, lng: -180 },
        { lat: 90, lng: 180 },
        { lat: 46.005030, lng: 8.956060 },
        { lat: 46.123456789, lng: 8.987654321 },
      ]

      origins.forEach((origin) => {
        const fragment = distance(origin)
        expect(fragment).toBeDefined()
        expect(() => sql`SELECT ${fragment}`).not.toThrow()
      })
    })
  })

  describe('withinDistance factory function', () => {
    const testOrigin: Coordinates = { lat: 46.005030, lng: 8.956060 }

    it('should generate valid geospatial filters', () => {
      const fragment = withinDistance(testOrigin, 1000)
      expect(fragment).toBeDefined()
      expect(() => sql`SELECT * FROM locations WHERE ${fragment}`).not.toThrow()
    })

    it('should handle different distance values', () => {
      const distances = [0, 100, 1000, 5000, 10000]

      distances.forEach((maxDistance) => {
        const fragment = withinDistance(testOrigin, maxDistance)
        expect(fragment).toBeDefined()
        expect(() => sql`SELECT * FROM locations WHERE ${fragment}`).not.toThrow()
      })
    })
  })

  describe('categoryFilter function (AND semantics)', () => {
    it('should handle various input scenarios', () => {
      // Test different input scenarios
      const scenarios = [
        [],
        ['restaurant'],
        ['restaurant', 'cafe', 'bar'],
        ['category-with-dash', 'category_with_underscore', 'category.with.dots'],
        null as any,
        undefined as any,
      ]

      scenarios.forEach((categories) => {
        const fragment = categoryFilter(categories)
        expect(fragment).toBeDefined()
        expect(() => sql`SELECT * FROM locations WHERE ${fragment}`).not.toThrow()
      })
    })
  })

  describe('categoryFilterOr function (OR semantics)', () => {
    it('should handle various input scenarios', () => {
      // Test different input scenarios
      const scenarios = [
        [],
        ['restaurant'],
        ['restaurant', 'cafe', 'bar'],
        ['category-with-dash', 'category_with_underscore', 'category.with.dots'],
        null as any,
        undefined as any,
      ]

      scenarios.forEach((categories) => {
        const fragment = categoryFilterOr(categories)
        expect(fragment).toBeDefined()
        expect(() => sql`SELECT * FROM locations WHERE ${fragment}`).not.toThrow()
      })
    })
  })

  describe('baseLocationSelect object', () => {
    it('should contain all required location fields', () => {
      const select = baseLocationSelect
      const expectedFields = [
        'uuid',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'photo',
        'gmapsPlaceId',
        'gmapsUrl',
        'website',
        'source',
        'timezone',
        'openingHours',
        'createdAt',
        'updatedAt',
        'categories',
      ]

      expectedFields.forEach((field) => {
        expect(select).toHaveProperty(field)
        expect(select[field as keyof typeof select]).toBeDefined()
      })
    })

    it('should use SQL fragments for computed fields', () => {
      const select = baseLocationSelect

      // These should be the same fragment instances
      expect(select.address).toBe(address)
      expect(select.latitude).toBe(latitude)
      expect(select.longitude).toBe(longitude)
      expect(select.categories).toBe(categoriesAgg)
    })

    it('should be usable in queries', () => {
      expect(() => {
        const fields = Object.values(baseLocationSelect)
        sql`SELECT ${sql.join(fields, sql`, `)} FROM locations`
      }).not.toThrow()
    })
  })

  describe('locationSelectWithDistance factory function', () => {
    const testOrigin: Coordinates = { lat: 46.005030, lng: 8.956060 }

    it('should include all base location fields plus distance', () => {
      const select = locationSelectWithDistance(testOrigin)

      // Should have all base fields
      Object.keys(baseLocationSelect).forEach((key) => {
        expect(select[key as keyof typeof select]).toBeDefined()
      })

      // Should have distance field
      expect(select.distanceMeters).toBeDefined()
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
        expect(() => sql`SELECT ${select.distanceMeters} FROM locations`).not.toThrow()
      })
    })

    it('should be usable in complete queries', () => {
      const select = locationSelectWithDistance(testOrigin)
      expect(() => {
        const fields = Object.values(select)
        sql`SELECT ${sql.join(fields, sql`, `)} FROM locations`
      }).not.toThrow()
    })
  })

  describe('integration behavior', () => {
    it('should allow combining fragments in complex queries', () => {
      const origin = { lat: 46.005030, lng: 8.956060 }
      const select = locationSelectWithDistance(origin)
      const categoryCondition = categoryFilterOr(['restaurant', 'cafe'])
      const distanceCondition = withinDistance(origin, 2000)

      expect(() => {
        const fields = Object.values(select)
        sql`
          SELECT ${sql.join(fields, sql`, `)}
          FROM locations 
          LEFT JOIN location_categories ON locations.uuid = location_categories.location_uuid
          LEFT JOIN categories ON location_categories.category_id = categories.id
          WHERE ${categoryCondition} AND ${distanceCondition}
          GROUP BY locations.uuid
          ORDER BY ${select.distanceMeters}
        `
      }).not.toThrow()
    })

    it('should create different behavior for AND vs OR category filters', () => {
      const categories = ['restaurant', 'cafe']
      const andFilter = categoryFilter(categories)
      const orFilter = categoryFilterOr(categories)

      // Both should be valid but different objects
      expect(andFilter).toBeDefined()
      expect(orFilter).toBeDefined()
      expect(andFilter).not.toBe(orFilter)

      // Both should be usable in queries
      expect(() => {
        sql`SELECT * FROM locations WHERE ${andFilter}`
        sql`SELECT * FROM locations WHERE ${orFilter}`
      }).not.toThrow()
    })

    it('should handle edge cases gracefully', () => {
      // Test various edge cases don't throw errors
      expect(() => {
        categoryFilter([])
        categoryFilterOr([])
        categoryFilter(null as any)
        categoryFilterOr(undefined as any)
        distance({ lat: 0, lng: 0 })
        withinDistance({ lat: 0, lng: 0 }, 0)

        // Test extreme coordinates
        distance({ lat: 90, lng: 180 })
        distance({ lat: -90, lng: -180 })
        withinDistance({ lat: 90, lng: 180 }, 0)
        withinDistance({ lat: -90, lng: -180 }, 999999)
      }).not.toThrow()
    })

    it('should maintain consistent behavior across multiple calls', () => {
      // Test that fragments are reusable and consistent
      const origin = { lat: 46.005030, lng: 8.956060 }

      const fragment1 = distance(origin)
      const fragment2 = distance(origin)

      // Should both be valid (though not necessarily identical objects)
      expect(fragment1).toBeDefined()
      expect(fragment2).toBeDefined()

      expect(() => {
        sql`SELECT ${fragment1} FROM locations`
        sql`SELECT ${fragment2} FROM locations`
      }).not.toThrow()
    })

    it('should work with realistic query patterns', () => {
      const origin = { lat: 46.005030, lng: 8.956060 }

      // Test patterns that would be used in real application code
      expect(() => {
        // Basic location query
        sql`SELECT ${sql.join(Object.values(baseLocationSelect), sql`, `)} FROM locations`

        // Location query with distance
        const selectWithDistance = locationSelectWithDistance(origin)
        sql`SELECT ${sql.join(Object.values(selectWithDistance), sql`, `)} FROM locations`

        // Filtered location query
        const categoryCondition = categoryFilter(['restaurant'])
        sql`
          SELECT ${sql.join(Object.values(baseLocationSelect), sql`, `)}
          FROM locations 
          WHERE ${categoryCondition}
        `

        // Complex filtered query with distance
        const orCondition = categoryFilterOr(['restaurant', 'cafe'])
        const distanceCondition = withinDistance(origin, 1000)
        sql`
          SELECT ${sql.join(Object.values(selectWithDistance), sql`, `)}
          FROM locations 
          WHERE ${orCondition} AND ${distanceCondition}
          ORDER BY ${selectWithDistance.distanceMeters}
          LIMIT 10
        `
      }).not.toThrow()
    })
  })
})

import * as tables from '../database/schema'
import { DUMMY_LOCATIONS } from '../utils/dummyData'

export default defineEventHandler(async () => {
  const db = useDrizzle()

  try {
    // Check if database is already seeded
    const existingLocations = await db.select().from(tables.locations).limit(1).all()
    if (existingLocations.length > 0) {
      return {
        success: true,
        message: 'Database already seeded',
        seeded: false,
      }
    }

    console.log('Seeding database...')

    // Extract all unique categories
    const allCategories = new Set<string>()
    DUMMY_LOCATIONS.forEach((location) => {
      location.categories.forEach(cat => allCategories.add(cat))
    })

    // Insert categories
    const categoryInserts = Array.from(allCategories).map(id => ({
      id,
      name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }))

    await db.insert(tables.categories).values(categoryInserts).onConflictDoNothing()

    // Insert locations one by one
    for (const location of DUMMY_LOCATIONS) {
      await db.insert(tables.locations).values({
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        rating: location.rating,
        photo: location.photo,
        gmapsPlaceId: location.gmapsPlaceId,
        gmapsUrl: location.gmapsUrl,
        website: location.website,
        categories: location.categories,
        source: location.source,
      }).onConflictDoNothing()
    }

    // Get inserted locations with their UUIDs
    const insertedLocations = await db.select().from(tables.locations).all()

    // Map gmapsPlaceId to UUID
    const placeIdToUuid = new Map(
      insertedLocations.map(loc => [loc.gmapsPlaceId, loc.uuid]),
    )

    // Create location-category relationships
    for (const location of DUMMY_LOCATIONS) {
      const uuid = placeIdToUuid.get(location.gmapsPlaceId)
      if (!uuid)
        continue

      for (const categoryId of location.categories) {
        await db.insert(tables.locationCategories).values({
          locationUuid: uuid,
          categoryId,
        }).onConflictDoNothing()
      }
    }

    console.log(`Seeded ${categoryInserts.length} categories, ${DUMMY_LOCATIONS.length} locations`)

    return {
      success: true,
      message: 'Database seeded successfully',
      seeded: true,
      stats: {
        categories: categoryInserts.length,
        locations: DUMMY_LOCATIONS.length,
      },
    }
  }
  catch (error) {
    console.error('Seeding error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Database seeding failed',
      data: error,
    })
  }
})

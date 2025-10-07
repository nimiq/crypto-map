#!/usr/bin/env node
import process from 'node:process'
import consola from 'consola'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql as sqlOp } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../schema'

config()

async function verifyDatabase() {
  const { DATABASE_URL } = process.env

  if (!DATABASE_URL) {
    consola.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const sql = postgres(DATABASE_URL, {
    prepare: false,
    ssl: 'require',
  })

  const db = drizzle(sql, { schema })

  try {
    consola.start('Verifying database setup...')

    // Check migrations
    const migrations = await db.select().from(schema.containerMigrations)
    consola.success(`✅ Migrations tracking: ${migrations.length} migrations applied`)
    migrations.forEach(m => consola.info(`   - ${m.filename}`))

    // Check categories
    const categoriesCount = await db
      .select({ count: sqlOp<number>`count(*)::int` })
      .from(schema.categories)
    consola.success(`✅ Categories: ${categoriesCount[0].count} categories seeded`)

    // Check locations
    const locationsCount = await db
      .select({ count: sqlOp<number>`count(*)::int` })
      .from(schema.locations)
    consola.success(`✅ Locations: ${locationsCount[0].count} locations seeded`)

    // Check location_categories
    const locationCategoriesCount = await db
      .select({ count: sqlOp<number>`count(*)::int` })
      .from(schema.locationCategories)
    consola.success(`✅ Location Categories: ${locationCategoriesCount[0].count} mappings created`)

    // Check PostGIS extension
    const postgisCheck = await sql`SELECT PostGIS_version() as version`
    consola.success(`✅ PostGIS: ${postgisCheck[0].version}`)

    consola.success('\n🎉 Database setup verified successfully!')
  }
  catch (error) {
    consola.error('Failed to verify database:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

verifyDatabase()

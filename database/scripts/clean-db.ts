#!/usr/bin/env node
import process from 'node:process'
import consola from 'consola'
import { config } from 'dotenv'
import postgres from 'postgres'

config()

async function cleanDatabase() {
  const { DATABASE_URL } = process.env

  if (!DATABASE_URL) {
    consola.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const sql = postgres(DATABASE_URL, {
    prepare: false,
    ssl: 'require',
  })

  try {
    consola.start('Dropping all tables...')

    // Drop tables in correct order (respecting foreign keys)
    await sql`DROP TABLE IF EXISTS location_categories CASCADE`
    consola.info('Dropped location_categories')

    await sql`DROP TABLE IF EXISTS locations CASCADE`
    consola.info('Dropped locations')

    await sql`DROP TABLE IF EXISTS categories CASCADE`
    consola.info('Dropped categories')

    await sql`DROP TABLE IF EXISTS __container_migrations CASCADE`
    consola.info('Dropped __container_migrations')

    consola.success('All tables dropped successfully!')
  }
  catch (error) {
    consola.error('Failed to clean database:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

cleanDatabase()

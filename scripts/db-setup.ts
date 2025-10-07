#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import consola from 'consola'
import { config } from 'dotenv'
import postgres from 'postgres'

config()

interface MigrationRecord {
  filename: string
}

async function runMigrations(sql: postgres.Sql) {
  const migrationsDir = join(process.cwd(), 'database/migrations')

  // Enable PostGIS extension
  consola.info('Enabling PostGIS extension...')
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`
  consola.success('PostGIS extension enabled')

  // Create migrations tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS public.__container_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )
  `

  // Get all migration files
  const files = await readdir(migrationsDir)
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort()

  consola.info(`Found ${sqlFiles.length} migration files`)

  for (const file of sqlFiles) {
    // Check if already applied
    const [existing] = await sql<MigrationRecord[]>`
      SELECT filename FROM public.__container_migrations WHERE filename = ${file}
    `

    if (existing) {
      consola.info(`Skipping migration ${file} (already applied)`)
      continue
    }

    consola.start(`Applying migration: ${file}`)
    const content = await readFile(join(migrationsDir, file), 'utf-8')

    try {
      await sql.unsafe(content)
      await sql`INSERT INTO public.__container_migrations (filename) VALUES (${file})`
      consola.success(`Applied migration: ${file}`)
    }
    catch (error: any) {
      if (error.message?.includes('already exists')) {
        consola.warn(`Migration ${file} appears to have been applied previously; marking as applied`)
        await sql`INSERT INTO public.__container_migrations (filename) VALUES (${file}) ON CONFLICT (filename) DO NOTHING`
      }
      else {
        consola.error(`Migration ${file} failed:`, error)
        throw error
      }
    }
  }

  consola.success('Migrations complete!')
}

async function runSeeds(sql: postgres.Sql) {
  const seedsDir = join(process.cwd(), 'database/seeds')

  consola.start('Running database seeds...')

  // Run RLS policies first
  const rlsPath = join(seedsDir, 'rls-policies.sql')
  try {
    const rlsContent = await readFile(rlsPath, 'utf-8')
    consola.start('Applying RLS policies...')
    await sql.unsafe(rlsContent)
    consola.success('RLS policies applied')
  }
  catch (error: any) {
    if (error.code !== 'ENOENT') {
      consola.error('Failed to apply RLS policies:', error)
      throw error
    }
  }

  // Run categories seed
  const categoriesPath = join(seedsDir, 'categories.sql')
  try {
    const categoriesContent = await readFile(categoriesPath, 'utf-8')
    consola.start('Seeding categories...')
    await sql.unsafe(categoriesContent)
    consola.success('Categories seeded')
  }
  catch (error: any) {
    if (error.code !== 'ENOENT') {
      consola.error('Failed to seed categories:', error)
      throw error
    }
  }

  // Run all source seeds
  const sourcesDir = join(seedsDir, 'sources')
  try {
    const sourceFiles = await readdir(sourcesDir)
    const sqlFiles = sourceFiles.filter(f => f.endsWith('.sql')).sort()

    for (const file of sqlFiles) {
      const content = await readFile(join(sourcesDir, file), 'utf-8')
      consola.start(`Seeding ${file}...`)
      await sql.unsafe(content)
      consola.success(`Seeded ${file}`)
    }
  }
  catch (error: any) {
    if (error.code !== 'ENOENT') {
      consola.error('Failed to seed sources:', error)
      throw error
    }
  }

  consola.success('Seeds complete!')
}

async function main() {
  const { DATABASE_URL } = process.env

  if (!DATABASE_URL) {
    consola.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const sql = postgres(DATABASE_URL, {
    prepare: false, // Disable prefetch for Transaction pool mode
    ssl: 'require',
    connection: {
      application_name: 'pay-app-setup',
    },
  })

  try {
    consola.info('Starting database setup...')
    await runMigrations(sql)
    await runSeeds(sql)
    consola.success('Database setup complete!')
  }
  catch (error) {
    consola.error('Database setup failed:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

main()

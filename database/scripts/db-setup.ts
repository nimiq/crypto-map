import { readdir, readFile } from 'node:fs/promises'
import process from 'node:process'
import { createConsola } from 'consola'
import { config } from 'dotenv'
import { join } from 'pathe'
import postgres from 'postgres'

config()

const consola = createConsola().withTag('db-setup')

interface Category {
  id: string
  name: string
  icon: string
  embeddings?: number[]
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    consola.error('DATABASE_URL environment variable is required')
    consola.info('Usage: DATABASE_URL=xxx pnpm run db:setup')
    process.exit(1)
  }

  const sql = postgres(databaseUrl, { prepare: false, idle_timeout: 60, statement_timeout: 60000 })

  try {
    consola.start('Setting up database...')

    // Enable extensions
    consola.info('Enabling extensions...')
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS postgis')
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS vector')

    // Run migrations
    consola.info('Running migrations...')
    const migrationsDir = join(import.meta.dirname, '..', 'migrations')
    const migrationFiles = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of migrationFiles) {
      const migrationPath = join(migrationsDir, file)
      const migrationSql = await readFile(migrationPath, 'utf-8')
      // Remove drizzle statement breakpoints
      const cleanSql = migrationSql.replace(/--> statement-breakpoint/g, ';')
      await sql.unsafe(cleanSql)
      consola.info(`Applied migration: ${file}`)
    }

    // Seed categories with embeddings
    consola.info('Seeding categories...')
    const categoriesPath = join(import.meta.dirname, 'categories.json')
    const categoriesContent = await readFile(categoriesPath, 'utf-8')
    const categories: Category[] = JSON.parse(categoriesContent)

    // Prepare all category data (embeddings are now included in the JSON)
    const categoryData = categories.map((category) => {
      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        embedding: category.embeddings
          ? JSON.stringify(category.embeddings)
          : null,
      }
    })

    // Batch insert all categories
    await sql`
      INSERT INTO categories ${sql(categoryData, 'id', 'name', 'icon', 'embedding')}
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, icon = EXCLUDED.icon, embedding = EXCLUDED.embedding
    `

    consola.info(`Seeded ${categories.length} categories`)

    // Run SQL files in order
    consola.info('Running SQL seed files...')
    const sqlDir = join(import.meta.dirname, '..', 'sql')
    const sqlFiles = (await readdir(sqlDir))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of sqlFiles) {
      const sqlPath = join(sqlDir, file)
      const sqlContent = await readFile(sqlPath, 'utf-8')
      // Suppress NOTICE messages for idempotent DROP POLICY IF EXISTS statements
      await sql.unsafe('SET client_min_messages = WARNING')
      await sql.unsafe(sqlContent)
      await sql.unsafe('SET client_min_messages = NOTICE')
      consola.info(`Applied: ${file}`)
    }

    consola.success('Database setup complete')
  }
  catch (error) {
    consola.error('Failed to setup database:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

main()

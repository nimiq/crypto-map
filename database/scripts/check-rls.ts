#!/usr/bin/env node
import process from 'node:process'
import consola from 'consola'
import { config } from 'dotenv'
import postgres from 'postgres'

config()

async function checkRLS() {
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
    consola.start('Checking RLS status on all tables...')

    const tables = await sql`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname IN ('public')
      ORDER BY tablename
    `

    consola.info('\n📊 RLS Status:')
    tables.forEach((table) => {
      const status = table.rls_enabled ? '🔒 ENABLED' : '🔓 DISABLED'
      consola.info(`   ${status} - ${table.schemaname}.${table.tablename}`)
    })

    // Check spatial_ref_sys specifically
    const spatialRefSys = await sql`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE tablename = 'spatial_ref_sys'
    `

    if (spatialRefSys.length > 0) {
      consola.box(`\n⚠️  spatial_ref_sys RLS Status: ${spatialRefSys[0].rls_enabled ? '🔒 ENABLED (Should be DISABLED)' : '✅ DISABLED (Correct)'}`)
    }
  }
  catch (error) {
    consola.error('Failed to check RLS:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

checkRLS()

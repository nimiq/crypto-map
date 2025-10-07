#!/usr/bin/env node
import process from 'node:process'
import consola from 'consola'
import { config } from 'dotenv'
import postgres from 'postgres'

config()

async function checkPermissions() {
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
    consola.start('Checking table ownership and permissions...')

    const tableInfo = await sql`
      SELECT
        t.schemaname,
        t.tablename,
        t.tableowner,
        obj_description(c.oid) as comment,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      ORDER BY t.tablename
    `

    consola.info('\n📊 Table Ownership:')
    tableInfo.forEach((table) => {
      consola.info(`   ${table.tablename}`)
      consola.info(`      Owner: ${table.tableowner}`)
      consola.info(`      Size: ${table.size}`)
    })

    // Check spatial_ref_sys specifically
    const spatialRefSys = await sql`
      SELECT
        t.schemaname,
        t.tablename,
        t.tableowner,
        has_table_privilege('anon', c.oid, 'SELECT') as anon_can_read,
        has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_read
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.tablename = 'spatial_ref_sys'
    `

    if (spatialRefSys.length > 0) {
      consola.box(`
⚠️  spatial_ref_sys Details:
   Owner: ${spatialRefSys[0].tableowner}
   Anon can read: ${spatialRefSys[0].anon_can_read ? '✅ YES' : '❌ NO'}
   Authenticated can read: ${spatialRefSys[0].authenticated_can_read ? '✅ YES' : '❌ NO'}
      `)
    }
  }
  catch (error) {
    consola.error('Failed to check permissions:', error)
    process.exit(1)
  }
  finally {
    await sql.end()
  }
}

checkPermissions()

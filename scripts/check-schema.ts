import process from 'node:process'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL!
const sql = postgres(databaseUrl)

async function checkSchema() {
  try {
    // Check locations table columns
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'locations'
      ORDER BY ordinal_position
    `

    console.log('Current locations table schema:')
    columns.forEach((col) => {
      console.log(`  ${col.column_name}: ${col.data_type}`)
    })

    const hasStreet = columns.some(c => c.column_name === 'street')
    const hasAddress = columns.some(c => c.column_name === 'address')

    console.log('\nSchema status:')
    console.log(`  Has 'street' column: ${hasStreet}`)
    console.log(`  Has 'address' column: ${hasAddress}`)

    if (hasAddress && !hasStreet) {
      console.log('\n⚠️  OLD SCHEMA DETECTED - Need to migrate from single address to split fields')
    }
    else if (hasStreet) {
      console.log('\n✅ NEW SCHEMA - Ready to go!')
    }
  }
  catch (error) {
    console.error('Error:', error)
  }
  finally {
    await sql.end()
  }
}

checkSchema()

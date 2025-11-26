import { consola } from 'consola'

const logger = consola.withTag('get-icons')

async function main() {
  try {
    logger.start('Fetching unique category icons...')

    const db = useDrizzle()

    const result = await db.execute(`
      SELECT DISTINCT icon 
      FROM categories 
      WHERE icon IS NOT NULL 
      ORDER BY icon
    `)

    const icons = result.map((row: any) => row.icon)

    logger.success(`Found ${icons.length} unique icons:`)
    console.log(JSON.stringify(icons, null, 2))

    logger.info('\nAdd to nuxt.config.ts clientBundle.icons:')
    console.log(JSON.stringify(icons))
  }
  catch (error) {
    logger.error('Failed to fetch icons:', error)
    process.exit(1)
  }
}

main()

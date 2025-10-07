import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createOpenAI } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import { createConsola } from 'consola'
import { join } from 'pathe'

const consola = createConsola().withTag('embedding')

const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_PARALLEL_CALLS = 5

interface Category {
  id: string
  name: string
  icon: string
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    consola.error('OPENAI_API_KEY environment variable is required')
    consola.info('Usage: OPENAI_API_KEY=xxx pnpm run db:generate-category-embeddings')
    process.exit(1)
  }

  // Check if embeddings directory already exists
  const outputDir = join(import.meta.dirname, '..', 'embeddings', 'categories')
  if (existsSync(outputDir)) {
    consola.warn('Embeddings directory already exists!')
    consola.warn(`Delete database/embeddings/categories/ and run again to regenerate`)
    process.exit(0)
  }

  // Load categories from JSON
  const categoriesPath = join(import.meta.dirname, 'categories.json')
  const categoriesContent = await readFile(categoriesPath, 'utf-8')
  const categories: Category[] = JSON.parse(categoriesContent)

  consola.info(`Found ${categories.length} categories`)
  consola.start(`Generating embeddings using ${EMBEDDING_MODEL}`)

  // Generate embeddings
  const openai = createOpenAI({ apiKey })
  const categoryNames = categories.map(c => c.name)

  try {
    const { embeddings, usage } = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: categoryNames,
      maxParallelCalls: MAX_PARALLEL_CALLS,
    })

    consola.success(`Generated ${embeddings.length} embeddings`)
    consola.info(`Token usage: ${usage.tokens} tokens`)

    // Create output directory
    await mkdir(outputDir, { recursive: true })

    // Write each embedding to a separate file
    await Promise.all(
      categories.map(async (cat, i) => {
        const embeddingStr = embeddings[i].join(',')
        const filePath = join(outputDir, `${cat.id}.txt`)
        await writeFile(filePath, embeddingStr, 'utf-8')
      }),
    )

    consola.success(`Embeddings saved to ${outputDir}`)
    consola.info('Commit these files to git to avoid regenerating embeddings')
  }
  catch (error) {
    consola.error('Failed to generate embeddings:', error)
    process.exit(1)
  }
}

main()

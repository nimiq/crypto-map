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
  embeddings?: number[]
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    consola.error('OPENAI_API_KEY environment variable is required')
    consola.info('Usage: OPENAI_API_KEY=xxx pnpm run db:generate-category-embeddings')
    process.exit(1)
  }

  // Check if embeddings already exist in categories.json
  const categoriesPath = join(import.meta.dirname, 'categories.json')
  const categoriesContent = await readFile(categoriesPath, 'utf-8')
  const categories: Category[] = JSON.parse(categoriesContent)

  const hasEmbeddings = categories.some(cat => cat.embeddings && cat.embeddings.length > 0)
  if (hasEmbeddings) {
    consola.warn('Categories already have embeddings!')
    consola.warn('Remove the "embeddings" field from categories.json and run again to regenerate')
    process.exit(0)
  }



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

    // Add embeddings to categories
    const updatedCategories = categories.map((cat, i) => ({
      ...cat,
      embeddings: embeddings[i],
    }))

    // Write updated categories back to JSON file
    await writeFile(categoriesPath, JSON.stringify(updatedCategories, null, 2), 'utf-8')

    consola.success(`Embeddings saved to ${categoriesPath}`)
    consola.info('Commit the updated categories.json file to git')
  }
  catch (error) {
    consola.error('Failed to generate embeddings:', error)
    process.exit(1)
  }
}

main()

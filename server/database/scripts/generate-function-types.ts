#!/usr/bin/env tsx
import { readdir, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { join } from 'pathe'

const FUNCTION_SIGNATURE_PATTERN = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\((.*?)\)/is
const PARAMETER_PARTS_PATTERN = /\s+/
const RETURN_TYPE_PATTERN = /RETURNS\s+(\w+(?:\s+\w+)*)/i
const FUNCTION_COMMENT_PATTERN = /COMMENT\s+ON\s+FUNCTION.*?IS\s+'(.*?)'/is

// Map PostgreSQL types to TypeScript types
const pgTypeToTs: Record<string, string> = {
  'bytea': 'Buffer',
  'integer': 'number',
  'int': 'number',
  'bigint': 'number',
  'smallint': 'number',
  'numeric': 'number',
  'real': 'number',
  'double precision': 'number',
  'text': 'string',
  'varchar': 'string',
  'character varying': 'string',
  'char': 'string',
  'boolean': 'boolean',
  'bool': 'boolean',
  'json': 'Record<string, unknown>',
  'jsonb': 'Record<string, unknown>',
  'uuid': 'string',
  'timestamp': 'Date',
  'timestamp with time zone': 'Date',
  'timestamptz': 'Date',
  'date': 'Date',
  'time': 'string',
}

interface FunctionDef {
  name: string
  params: Array<{ name: string, type: string }>
  returnType: string
  comment?: string
}

function mapPgTypeToTs(pgType: string): string {
  const normalized = pgType.trim().toLowerCase()
  return pgTypeToTs[normalized] || 'unknown'
}

function parseFunctionSignature(sql: string): FunctionDef | null {
  // Extract function name and parameters
  const funcMatch = sql.match(FUNCTION_SIGNATURE_PATTERN)
  if (!funcMatch)
    return null

  const name = funcMatch[1]
  const paramsStr = funcMatch[2]
  if (!name || paramsStr === undefined)
    return null

  // Parse parameters
  const params: Array<{ name: string, type: string }> = []
  if (paramsStr.trim()) {
    const paramPairs = paramsStr.split(',').map(p => p.trim())
    for (const pair of paramPairs) {
      const parts = pair.trim().split(PARAMETER_PARTS_PATTERN)
      if (parts.length >= 2) {
        const paramName = parts[0]
        const paramType = parts[1]
        if (!paramName || !paramType)
          continue
        params.push({ name: paramName, type: mapPgTypeToTs(paramType) })
      }
    }
  }

  // Extract return type
  const returnMatch = sql.match(RETURN_TYPE_PATTERN)
  const returnType = returnMatch?.[1] ? mapPgTypeToTs(returnMatch[1]) : 'void'

  // Extract comment if present
  const commentMatch = sql.match(FUNCTION_COMMENT_PATTERN)
  const comment = commentMatch?.[1]

  return { name, params, returnType, comment }
}

async function generateFunctionTypes() {
  console.log('🔍 Parsing SQL function files...\n')

  const functionsDir = join(import.meta.dirname, '..', 'functions')
  const files = (await readdir(functionsDir)).filter(f => f.endsWith('.sql')).sort()

  if (files.length === 0) {
    console.log('⚠️  No SQL function files found')
    return
  }

  console.log(`Found ${files.length} function file(s):`)
  files.forEach(f => console.log(`  - ${f}`))
  console.log()

  const functions: FunctionDef[] = []

  for (const file of files) {
    const filePath = join(functionsDir, file)
    const content = await readFile(filePath, 'utf-8')
    const func = parseFunctionSignature(content)
    if (func) {
      functions.push(func)
      console.log(`✓ Parsed: ${func.name}()`)
    }
    else {
      console.warn(`⚠️  Could not parse: ${file}`)
    }
  }

  console.log()

  // Generate TypeScript interface
  let output = 'import type { Buffer } from \'node:buffer\'\n\n'
  output += '/**\n * PostgreSQL function type definitions\n'
  output += ' * Auto-generated from SQL files in database/functions/\n'
  output += ' * Run: pnpm run db:generate-functions\n */\n\n'
  output += 'export interface DbFunctions {\n'

  for (const func of functions) {
    if (func.comment) {
      output += `  /**\n   * ${func.comment}\n   */\n`
    }

    output += `  ${func.name}: {\n`

    // Build args object
    if (func.params.length === 0) {
      output += `    args: Record<string, never>\n`
    }
    else {
      output += `    args: {\n`
      for (const param of func.params) {
        output += `      ${param.name}: ${param.type}\n`
      }
      output += `    }\n`
    }

    output += `    returns: ${func.returnType}\n`
    output += `  }\n`
  }

  output += '}\n\n'
  output += 'export type FunctionArgs<T extends keyof DbFunctions> = DbFunctions[T][\'args\']\n'
  output += 'export type FunctionReturns<T extends keyof DbFunctions> = DbFunctions[T][\'returns\']\n'

  // Write to file
  const outputPath = join(import.meta.dirname, '..', 'functions.ts')
  await writeFile(outputPath, output, 'utf-8')

  console.log('✅ Generated types at database/functions.ts\n')
}

generateFunctionTypes().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})

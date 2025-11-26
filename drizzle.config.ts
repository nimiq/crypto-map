import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

// TODO Maybe remove this file when NuxtHub v1 is stable

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})

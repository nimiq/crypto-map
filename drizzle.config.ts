import { defineConfig } from 'drizzle-kit'

const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env
const url = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`

export default defineConfig({
  dialect: 'postgresql',
  schema: './supabase/schema.ts',
  out: './supabase/migrations',
  dbCredentials: {
    url,
  },
})

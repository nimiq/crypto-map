import { sql } from 'drizzle-orm'
import {
  customType,
  doublePrecision,
  geometry,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

// Custom vector type for pgvector extension
const vector = customType<{
  data: number[]
  driverData: string
  config: { dimensions?: number }
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value)
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
})

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    embedding: vector({ dimensions: 1536 }),
  },
  () => [
    // Using raw SQL for HNSW index with vector_cosine_ops operator class
    // Drizzle doesn't support operator classes natively yet
    index('categories_embedding_idx')
      .using('hnsw', sql`embedding vector_cosine_ops`)
      .with({ m: 16, ef_construction: 64 }),
  ],
)

export type Category = typeof categories.$inferSelect

export const locations = pgTable(
  'locations',
  {
    uuid: text('uuid')
      .primaryKey()
      .default(sql`gen_random_uuid()`)
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    street: text('street').notNull(),
    city: text('city').notNull(),
    postalCode: text('postal_code').notNull(),
    region: text('region'),
    country: text('country').notNull(),
    location: geometry('location', {
      type: 'point',
      mode: 'tuple',
      srid: 4326,
    }).notNull(),
    rating: doublePrecision('rating'),
    ratingCount: doublePrecision('rating_count'),
    photos: text('photos').array(),
    gmapsPlaceId: text('gmaps_place_id').notNull().unique(),
    gmapsUrl: text('gmaps_url').notNull(),
    website: text('website'),
    source: varchar('source', {
      length: 20,
      enum: ['naka', 'bluecode'],
    }).notNull(),
    timezone: text('timezone').notNull(),
    openingHours: text('opening_hours'),
    updatedAt: timestamp('updated_at')
      .default(sql`NOW()`)
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    createdAt: timestamp('created_at')
      .default(sql`NOW()`)
      .$defaultFn(() => new Date()),
  },
  table => [index('location_spatial_idx').using('gist', table.location)],
)

export type Location = typeof locations.$inferSelect

export const locationCategories = pgTable(
  'location_categories',
  {
    locationUuid: text('location_uuid')
      .notNull()
      .references(() => locations.uuid, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at')
      .default(sql`NOW()`)
      .$defaultFn(() => new Date()),
  },
  table => [
    primaryKey({ columns: [table.locationUuid, table.categoryId] }),
    index('location_idx').on(table.locationUuid),
    index('category_idx').on(table.categoryId),
  ],
)

export type LocationCategory = typeof locationCategories.$inferSelect

export const categoryHierarchies = pgTable(
  'category_hierarchies',
  {
    childId: text('child_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    parentId: text('parent_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at')
      .default(sql`NOW()`)
      .$defaultFn(() => new Date()),
  },
  table => [
    primaryKey({ columns: [table.childId, table.parentId] }),
    index('category_hierarchies_child_idx').on(table.childId),
    index('category_hierarchies_parent_idx').on(table.parentId),
  ],
)

export type CategoryHierarchy = typeof categoryHierarchies.$inferSelect

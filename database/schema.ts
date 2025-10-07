import { doublePrecision, geometry, index, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
})

export type Category = typeof categories.$inferSelect

export const locations = pgTable('locations', {
  uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  address: text('address').notNull(),
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  rating: doublePrecision('rating'),
  photo: text('photo'),
  gmapsPlaceId: text('gmaps_place_id').notNull().unique(),
  gmapsUrl: text('gmaps_url').notNull(),
  website: text('website'),
  source: varchar('source', { length: 20, enum: ['naka', 'bluecode'] }).notNull(),
  timezone: text('timezone').notNull(),
  openingHours: text('opening_hours'),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
}, table => [
  index('location_spatial_idx').using('gist', table.location),
])

export const locationCategories = pgTable('location_categories', {
  locationUuid: text('location_uuid').notNull().references(() => locations.uuid, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
}, table => [
  primaryKey({ columns: [table.locationUuid, table.categoryId] }),
  index('location_idx').on(table.locationUuid),
  index('category_idx').on(table.categoryId),
])

export type LocationCategory = typeof locationCategories.$inferSelect

export const containerMigrations = pgTable('__container_migrations', {
  filename: text('filename').primaryKey(),
  appliedAt: timestamp('applied_at').$defaultFn(() => new Date()),
})

export type ContainerMigration = typeof containerMigrations.$inferSelect

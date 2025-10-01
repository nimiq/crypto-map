import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, () => [])

export const locations = sqliteTable('locations', {
  uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  rating: real('rating'),
  photo: text('photo'),
  gmapsPlaceId: text('gmaps_place_id').notNull(),
  gmapsUrl: text('gmaps_url').notNull(),
  website: text('website'),
  source: text('source', { enum: ['naka', 'bluecode'] }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const locationCategories = sqliteTable('location_categories', {
  locationUuid: text('location_uuid').notNull().references(() => locations.uuid, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, table => [
  primaryKey({ columns: [table.locationUuid, table.categoryId] }),
  index('location_idx').on(table.locationUuid),
  index('category_idx').on(table.categoryId),
])

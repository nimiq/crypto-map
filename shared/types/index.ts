import type * as schema from '../../database/schema'

export type Location = typeof schema.locations.$inferSelect
export type Category = typeof schema.categories.$inferSelect
export type LocationCategory = typeof schema.locationCategories.$inferSelect

export type CategoryResponse = Pick<Category, 'id' | 'name' | 'icon'>

export type LocationResponse = Omit<Location, 'location'> & {
  latitude: number
  longitude: number
  categoryIds: string
  categories: CategoryResponse[]
}

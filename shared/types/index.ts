import type { categories, locationCategories, locations } from '../../database/schema'

export type Location = typeof locations.$inferSelect
export type Category = typeof categories.$inferSelect
export type LocationCategory = typeof locationCategories.$inferSelect

export type CategoryResponse = Pick<Category, 'id' | 'name' | 'icon'>

export interface SearchLocationOptions {
  origin?: {
    lat: number
    lng: number
  }
  maxDistanceMeters?: number
}

export type LocationResponse = Omit<Location, 'location'> & {
  latitude: number
  longitude: number
  categoryIds: string
  categories: CategoryResponse[]
  distanceMeters?: number
}

export type SearchLocationResponse = LocationResponse & {
  highlightedName?: string
}

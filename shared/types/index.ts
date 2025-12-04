import type { categories, locationCategories, locations } from '../../server/database/schema'

export type Location = typeof locations.$inferSelect
export type Category = typeof categories.$inferSelect
export type LocationCategory = typeof locationCategories.$inferSelect

export type CategoryResponse = Pick<Category, 'id' | 'name' | 'icon'>

export interface SearchLocationOptions {
  origin?: { lat: number, lng: number }
  maxDistanceMeters?: number
  categories?: string[]
  page?: number
  limit?: number
  fetchLimit?: number
}

export type LocationResponse = Omit<Location, 'location' | 'street' | 'postalCode' | 'region'> & {
  address: string
  latitude: number
  longitude: number
  categoryIds: string
  categories: CategoryResponse[]
  primaryCategory?: CategoryResponse
  distanceMeters?: number
}

export type SearchLocationResponse = LocationResponse & {
  highlightedName?: string
  icon?: string
}

export interface CategorySuggestion {
  categoryId: string
  similarity: number
  source: 'embedding' | 'keyword'
}

export type LocationDetailResponse = Omit<Location, 'location' | 'street' | 'postalCode' | 'region'> & {
  address: string
  latitude: number
  longitude: number
  categories: CategoryResponse[]
  primaryCategory?: CategoryResponse
}

export interface QuickCategoryItem {
  category?: string
  query?: string
  label: string
  icon: string
  color: 'orange' | 'gold' | 'red' | 'purple' | 'green' | 'neutral'
  isHistory?: boolean
}

export type GeoType = 'city' | 'address' | 'region'

export interface GeoResult {
  kind: 'geo'
  name: string
  displayName: string
  latitude: number
  longitude: number
  geoType: GeoType
}

export interface AutocompleteResponse {
  locations: SearchLocationResponse[]
  geo: GeoResult[] // Strong matches (show before locations)
  geoWeak: GeoResult[] // Weak matches (show after locations)
}

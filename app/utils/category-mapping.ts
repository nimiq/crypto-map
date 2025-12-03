/**
 * Centralized category-to-icon and category-to-color mapping
 * Single source of truth for map marker styling
 */

const colors = {
  food: '#DB6C1E',
  commercial: '#1A73E8',
  service: '#5C6BC0',
  entertainment: '#8242D3',
  health: '#DC3B45',
  lodging: '#E430B1',
  transportation: '#2763B1',
  sports: '#17a773',
  misc: '#546E7A',
} as const

// Icon → categories mapping
const iconMappings: Record<string, string[]> = {
  restaurant: [
    'restaurant',
    'fast_food_restaurant',
    'pizza_restaurant',
    'italian_restaurant',
    'chinese_restaurant',
    'thai_restaurant',
    'seafood_restaurant',
    'steak_house',
    'bar_and_grill',
    'meal_takeaway',
    'food_court',
    'american_restaurant',
    'asian_restaurant',
    'brazilian_restaurant',
    'french_restaurant',
    'greek_restaurant',
    'indian_restaurant',
    'indonesian_restaurant',
    'japanese_restaurant',
    'korean_restaurant',
    'lebanese_restaurant',
    'mediterranean_restaurant',
    'mexican_restaurant',
    'middle_eastern_restaurant',
    'spanish_restaurant',
    'turkish_restaurant',
    'vietnamese_restaurant',
    'vegan_restaurant',
    'vegetarian_restaurant',
    'afghani_restaurant',
    'african_restaurant',
    'barbecue_restaurant',
    'breakfast_restaurant',
    'brunch_restaurant',
    'buffet_restaurant',
    'diner',
    'cafeteria',
    'dessert_restaurant',
    'fine_dining_restaurant',
    'hamburger_restaurant',
    'ramen_restaurant',
    'sushi_restaurant',
    'meal_delivery',
    'food_delivery',
    'catering_service',
  ],
  cafe: [
    'cafe',
    'coffee_shop',
    'bakery',
    'ice_cream_shop',
    'dessert_shop',
    'confectionery',
    'tea_house',
    'internet_cafe',
    'acai_shop',
    'bagel_shop',
    'donut_shop',
    'juice_shop',
    'chocolate_shop',
    'candy_store',
    'cat_cafe',
    'dog_cafe',
  ],
  bar: ['bar', 'wine_bar', 'night_club', 'pub', 'karaoke'],
  shopping: [
    'store',
    'clothing_store',
    'electronics_store',
    'jewelry_store',
    'furniture_store',
    'home_goods_store',
    'home_improvement_store',
    'hardware_store',
    'sporting_goods_store',
    'book_store',
    'pet_store',
    'gift_shop',
    'department_store',
    'shopping_mall',
    'liquor_store',
    'bicycle_store',
    'auto_parts_store',
    'warehouse_store',
    'florist',
    'shoe_store',
    'cell_phone_store',
    'discount_store',
    'market',
  ],
  grocery: [
    'grocery_store',
    'food_store',
    'supermarket',
    'asian_grocery_store',
    'butcher_shop',
    'deli',
    'sandwich_shop',
  ],
  convenience: ['convenience_store'],
  gas: ['gas_station', 'electric_vehicle_charging_station'],
  lodging: [
    'lodging',
    'hotel',
    'hostel',
    'bed_and_breakfast',
    'resort_hotel',
    'motel',
    'guest_house',
    'inn',
    'extended_stay_hotel',
    'budget_japanese_inn',
    'japanese_inn',
    'farmstay',
    'campground',
    'camping_cabin',
    'cottage',
    'private_guest_room',
    'rv_park',
  ],
  pharmacy: [
    'pharmacy',
    'drugstore',
    'hospital',
    'dental_clinic',
    'dentist',
    'doctor',
    'medical_lab',
    'veterinary_care',
    'physiotherapist',
    'chiropractor',
  ],
  bank: ['bank'],
  atm: ['atm'],
  post_office: ['post_office', 'courier_service'],
  movie: ['movie_theater', 'movie_rental'],
  museum: ['museum', 'art_gallery', 'planetarium'],
  theater: [
    'theater',
    'performing_arts_theater',
    'cultural_center',
    'auditorium',
    'concert_hall',
    'opera_house',
    'philharmonic_hall',
    'comedy_club',
  ],
  aquarium: ['aquarium', 'zoo', 'amusement_park', 'water_park', 'wildlife_park', 'wildlife_refuge'],
  historic: [
    'tourist_attraction',
    'visitor_center',
    'tourist_information_center',
    'historical_place',
    'historical_landmark',
    'monument',
    'cultural_landmark',
    'sculpture',
  ],
  airport: ['airport', 'international_airport', 'airstrip', 'heliport'],
  train: ['train_station', 'transit_station', 'subway_station', 'light_rail_station', 'transit_depot'],
  bus: ['bus_station', 'bus_stop', 'taxi_stand', 'ferry_terminal'],
  golf: ['golf_course'],
  misc: ['gym', 'fitness_center'],
}

// Color group → categories (derived from icon mappings)
const colorGroups = {
  food: [...iconMappings.restaurant!, ...iconMappings.cafe!, ...iconMappings.bar!],
  commercial: [...iconMappings.shopping!, ...iconMappings.grocery!, ...iconMappings.convenience!, ...iconMappings.gas!],
  service: [...iconMappings.bank!, ...iconMappings.atm!, ...iconMappings.post_office!],
  entertainment: [...iconMappings.movie!, ...iconMappings.museum!, ...iconMappings.theater!, ...iconMappings.aquarium!, ...iconMappings.historic!],
  health: [...iconMappings.pharmacy!],
  lodging: [...iconMappings.lodging!],
  transportation: [...iconMappings.airport!, ...iconMappings.train!, ...iconMappings.bus!],
  sports: [...iconMappings.golf!, ...iconMappings.misc!],
  misc: [] as string[], // default fallback, no explicit categories
} satisfies Record<keyof typeof colors, string[]>

// Build reverse lookup: category → icon
function buildCategoryToIconMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [icon, categories] of Object.entries(iconMappings)) {
    for (const category of categories) {
      map.set(category, icon)
    }
  }
  return map
}

// Build reverse lookup: category → color
function buildCategoryToColorMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [colorGroup, categories] of Object.entries(colorGroups)) {
    const color = colors[colorGroup as keyof typeof colors]
    for (const category of categories) {
      map.set(category, color)
    }
  }
  return map
}

const categoryToIcon = buildCategoryToIconMap()
const categoryToColor = buildCategoryToColorMap()

/** Build MapLibre match expression pairs for icons: [category, icon, category, icon, ...] */
export function buildIconMatches(): string[] {
  const matches: string[] = []
  for (const [category, icon] of categoryToIcon) {
    matches.push(category, icon)
  }
  return matches
}

/** Build MapLibre match expression pairs for colors: [category, color, category, color, ...] */
export function buildColorMatches(): string[] {
  const matches: string[] = []
  for (const [category, color] of categoryToColor) {
    matches.push(category, color)
  }
  return matches
}

export const defaultIcon = 'misc'
export const defaultColor = colors.misc

/** Backwards compatibility export matching the old labelColors structure */
export const labelColors = Object.fromEntries(categoryToColor) as Record<string, string>

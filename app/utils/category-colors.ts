/**
 * Google Maps category color mapping
 * Based on: https://developers.google.com/maps/documentation/places/web-service/icons
 *
 * Uses semantic pattern matching to assign colors to categories dynamically
 */

export const CATEGORY_COLORS = {
  FOOD_DRINK: '#DB6C1E',
  RETAIL: '#4B96F3',
  SERVICES: '#909CE1',
  ENTERTAINMENT: '#13B5C7',
  TRANSPORTATION: '#10BDFF',
  MUNICIPAL: '#7B9EB0',
  OUTDOOR: '#4DB546',
  EMERGENCY: '#F88181',
} as const

// Category patterns to color mappings (ordered by specificity)
const CATEGORY_PATTERNS: Array<{ pattern: RegExp, color: string }> = [
  // Food & Drink - #FF9E67
  { pattern: /restaurant|cafe|coffee|bar|bakery|food|meal|ice_cream|juice|sandwich|pizza|sushi|brunch|breakfast|lunch|dinner|buffet|grill/, color: CATEGORY_COLORS.FOOD_DRINK },

  // Retail - #4B96F3
  { pattern: /store|shop|mall|market|supermarket|pharmacy|bookstore|clothing|electronics|jewelry|bicycle/, color: CATEGORY_COLORS.RETAIL },

  // Services - #909CE1
  { pattern: /atm|bank|gas_station|car_rental|car_repair|car_wash|laundry|salon|spa|barber|beauty|accounting|legal|moving|plumber|electrician|roofing/, color: CATEGORY_COLORS.SERVICES },

  // Entertainment - #13B5C7
  { pattern: /museum|gallery|theater|casino|night_club|amusement|aquarium|zoo|bowling|movie|tourist/, color: CATEGORY_COLORS.ENTERTAINMENT },

  // Transportation - #10BDFF
  { pattern: /airport|station|transit|ferry|taxi|bus_|train_|subway|light_rail/, color: CATEGORY_COLORS.TRANSPORTATION },

  // Outdoor - #4DB546
  { pattern: /park|campground|golf|stadium|sports|athletic|playground|garden|hiking|trail/, color: CATEGORY_COLORS.OUTDOOR },

  // Emergency - #F88181
  { pattern: /hospital|doctor|dentist|veterinarian|police|fire_station|clinic|medical|health/, color: CATEGORY_COLORS.EMERGENCY },

  // Municipal/Generic - #7B9EB0 (default)
  { pattern: /city_hall|courthouse|library|school|university|church|temple|mosque|synagogue|worship|cemetery|post_office|government|administrative/, color: CATEGORY_COLORS.MUNICIPAL },
]

/**
 * Get color for a category ID using semantic pattern matching
 */
export function getCategoryColor(categoryId: string): string {
  for (const { pattern, color } of CATEGORY_PATTERNS) {
    if (pattern.test(categoryId)) {
      return color
    }
  }
  return CATEGORY_COLORS.MUNICIPAL // Default
}

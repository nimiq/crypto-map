/**
 * Label colors for map markers by category
 */

const commercialBlue = '#1A73E8'
const foodOrange = '#DB6C1E'
const servicePurple = '#5C6BC0'
const entertainmentPurple = '#8242D3'
const pharmacyRed = '#DC3B45'
const lodgingPink = '#E430B1'
const miscGray = '#546E7A'
const transportationBlue = '#2763B1'

export const labelColors = {
  // Commercial
  store: commercialBlue,
  shopping_mall: commercialBlue,
  supermarket: commercialBlue,
  convenience_store: commercialBlue,
  grocery_or_supermarket: commercialBlue,
  gas_station: commercialBlue,
  department_store: commercialBlue,
  home_goods_store: commercialBlue,
  electronics_store: commercialBlue,
  clothing_store: commercialBlue,
  shoe_store: commercialBlue,
  jewelry_store: commercialBlue,
  book_store: commercialBlue,
  bicycle_store: commercialBlue,
  hardware_store: commercialBlue,
  furniture_store: commercialBlue,
  pet_store: commercialBlue,
  florist: commercialBlue,
  liquor_store: commercialBlue,

  // Food & Drink
  restaurant: foodOrange,
  cafe: foodOrange,
  bar: foodOrange,
  bakery: foodOrange,
  meal_takeaway: foodOrange,
  meal_delivery: foodOrange,
  food: foodOrange,

  // Banks & Post
  bank: servicePurple,
  atm: servicePurple,
  post_office: servicePurple,
  finance: servicePurple,

  // Entertainment
  movie_theater: entertainmentPurple,
  museum: entertainmentPurple,
  art_gallery: entertainmentPurple,
  aquarium: entertainmentPurple,
  zoo: entertainmentPurple,
  amusement_park: entertainmentPurple,
  bowling_alley: entertainmentPurple,
  casino: entertainmentPurple,
  night_club: entertainmentPurple,
  theater: entertainmentPurple,
  tourist_attraction: entertainmentPurple,

  // Pharmacy
  pharmacy: pharmacyRed,
  drugstore: pharmacyRed,

  // Lodging
  lodging: lodgingPink,
  hotel: lodgingPink,
  motel: lodgingPink,
  hostel: lodgingPink,
  guest_house: lodgingPink,
  bed_and_breakfast: lodgingPink,

  // Transportation
  airport: transportationBlue,
  bus_station: transportationBlue,
  train_station: transportationBlue,
  transit_station: transportationBlue,
  subway_station: transportationBlue,
  light_rail_station: transportationBlue,
  taxi_stand: transportationBlue,

  // Misc (default)
  misc: miscGray,
} as const

import { DUMMY_LOCATIONS } from '../utils/dummyData'
import * as tables from '../database/schema'

export default defineNitroPlugin(() => {
  onHubReady(async () => {
    const db = useDrizzle()

    // Check if database is already seeded
    const existingLocations = await db.select().from(tables.locations).limit(1).all()
    if (existingLocations.length > 0) {
      console.log('Database already seeded, skipping...')
      return
    }

    console.log('Seeding database...')

    // All Google Maps category types (Table A from new Places API)
    // Source: https://developers.google.com/maps/documentation/places/web-service/place-types
    // Last updated: 2025-09-25 (315 types)
    const ALL_GMAPS_CATEGORIES = [
      'car_dealer', 'car_rental', 'car_repair', 'car_wash', 'electric_vehicle_charging_station', 'gas_station', 'parking', 'rest_stop',
      'corporate_office', 'farm', 'ranch',
      'art_gallery', 'art_studio', 'auditorium', 'cultural_landmark', 'historical_place', 'monument', 'museum', 'performing_arts_theater', 'sculpture',
      'library', 'preschool', 'primary_school', 'school', 'secondary_school', 'university',
      'adventure_sports_center', 'amphitheatre', 'amusement_center', 'amusement_park', 'aquarium', 'banquet_hall', 'barbecue_area', 'botanical_garden', 'bowling_alley', 'casino', 'childrens_camp', 'comedy_club', 'community_center', 'concert_hall', 'convention_center', 'cultural_center', 'cycling_park', 'dance_hall', 'dog_park', 'event_venue', 'ferris_wheel', 'garden', 'hiking_area', 'historical_landmark', 'internet_cafe', 'karaoke', 'marina', 'movie_rental', 'movie_theater', 'national_park', 'night_club', 'observation_deck', 'off_roading_area', 'opera_house', 'park', 'philharmonic_hall', 'picnic_ground', 'planetarium', 'plaza', 'roller_coaster', 'skateboard_park', 'state_park', 'tourist_attraction', 'video_arcade', 'visitor_center', 'water_park', 'wedding_venue', 'wildlife_park', 'wildlife_refuge', 'zoo',
      'public_bath', 'public_bathroom', 'stable',
      'accounting', 'atm', 'bank',
      'acai_shop', 'afghani_restaurant', 'african_restaurant', 'american_restaurant', 'asian_restaurant', 'bagel_shop', 'bakery', 'bar', 'bar_and_grill', 'barbecue_restaurant', 'brazilian_restaurant', 'breakfast_restaurant', 'brunch_restaurant', 'buffet_restaurant', 'cafe', 'cafeteria', 'candy_store', 'cat_cafe', 'chinese_restaurant', 'chocolate_factory', 'chocolate_shop', 'coffee_shop', 'confectionery', 'deli', 'dessert_restaurant', 'dessert_shop', 'diner', 'dog_cafe', 'donut_shop', 'fast_food_restaurant', 'fine_dining_restaurant', 'food_court', 'french_restaurant', 'greek_restaurant', 'hamburger_restaurant', 'ice_cream_shop', 'indian_restaurant', 'indonesian_restaurant', 'italian_restaurant', 'japanese_restaurant', 'juice_shop', 'korean_restaurant', 'lebanese_restaurant', 'meal_delivery', 'meal_takeaway', 'mediterranean_restaurant', 'mexican_restaurant', 'middle_eastern_restaurant', 'pizza_restaurant', 'pub', 'ramen_restaurant', 'restaurant', 'sandwich_shop', 'seafood_restaurant', 'spanish_restaurant', 'steak_house', 'sushi_restaurant', 'tea_house', 'thai_restaurant', 'turkish_restaurant', 'vegan_restaurant', 'vegetarian_restaurant', 'vietnamese_restaurant', 'wine_bar',
      'city_hall', 'courthouse', 'embassy', 'fire_station', 'government_office', 'local_government_office', 'neighborhood_police_station', 'police', 'post_office',
      'chiropractor', 'dental_clinic', 'dentist', 'doctor', 'drugstore', 'hospital', 'massage', 'medical_lab', 'pharmacy', 'physiotherapist', 'sauna', 'skin_care_clinic', 'spa', 'tanning_studio', 'wellness_center', 'yoga_studio',
      'bed_and_breakfast', 'budget_japanese_inn', 'campground', 'camping_cabin', 'cottage', 'extended_stay_hotel', 'farmstay', 'guest_house', 'hostel', 'hotel', 'inn', 'japanese_inn', 'lodging', 'mobile_home_park', 'motel', 'private_guest_room', 'resort_hotel', 'rv_park',
      'church', 'hindu_temple', 'mosque', 'synagogue',
      'astrologer', 'barber_shop', 'beautician', 'beauty_salon', 'body_art_service', 'catering_service', 'cemetery', 'child_care_agency', 'consultant', 'courier_service', 'electrician', 'florist', 'food_delivery', 'foot_care', 'funeral_home', 'hair_care', 'hair_salon', 'insurance_agency', 'laundry', 'lawyer', 'locksmith', 'makeup_artist', 'moving_company', 'nail_salon', 'painter', 'plumber', 'psychic', 'real_estate_agency', 'roofing_contractor', 'storage', 'summer_camp_organizer', 'tailor', 'telecommunications_service_provider', 'tour_agency', 'tourist_information_center', 'travel_agency', 'veterinary_care',
      'asian_grocery_store', 'auto_parts_store', 'bicycle_store', 'book_store', 'butcher_shop', 'cell_phone_store', 'clothing_store', 'convenience_store', 'department_store', 'discount_store', 'electronics_store', 'food_store', 'furniture_store', 'gift_shop', 'grocery_store', 'hardware_store', 'home_goods_store', 'home_improvement_store', 'jewelry_store', 'liquor_store', 'market', 'pet_store', 'shoe_store', 'shopping_mall', 'sporting_goods_store', 'store', 'supermarket', 'warehouse_store', 'wholesaler',
      'arena', 'athletic_field', 'fishing_charter', 'fishing_pond', 'fitness_center', 'golf_course', 'gym', 'ice_skating_rink', 'playground', 'ski_resort', 'sports_activity_location', 'sports_club', 'sports_coaching', 'sports_complex', 'stadium', 'swimming_pool',
      'airport', 'airstrip', 'bus_station', 'bus_stop', 'ferry_terminal', 'heliport', 'international_airport', 'light_rail_station', 'park_and_ride', 'subway_station', 'taxi_stand', 'train_station', 'transit_depot', 'transit_station', 'truck_stop',
      'administrative_area_level_1', 'administrative_area_level_2', 'country', 'locality', 'postal_code', 'school_district',
      'apartment_building', 'apartment_complex', 'condominium_complex', 'housing_complex',
      'beach',
    ]

    // Insert all categories in batches to avoid SQL variable limit
    const categoryInserts = ALL_GMAPS_CATEGORIES.map(id => ({
      id,
      name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }))

    const BATCH_SIZE = 30
    for (let i = 0; i < categoryInserts.length; i += BATCH_SIZE) {
      const batch = categoryInserts.slice(i, i + BATCH_SIZE)
      await db.insert(tables.categories).values(batch).onConflictDoNothing()
    }

    // Insert locations one by one
    for (const location of DUMMY_LOCATIONS) {
      await db.insert(tables.locations).values({
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        rating: location.rating,
        photo: location.photo,
        gmapsPlaceId: location.gmapsPlaceId,
        gmapsUrl: location.gmapsUrl,
        website: location.website,
        categories: location.categories,
        source: location.source,
      }).onConflictDoNothing()
    }

    // Get inserted locations with their UUIDs
    const insertedLocations = await db.select().from(tables.locations).all()

    // Map gmapsPlaceId to UUID
    const placeIdToUuid = new Map(
      insertedLocations.map(loc => [loc.gmapsPlaceId, loc.uuid]),
    )

    // Create location-category relationships one by one
    for (const location of DUMMY_LOCATIONS) {
      const uuid = placeIdToUuid.get(location.gmapsPlaceId)
      if (!uuid)
        continue

      for (const categoryId of location.categories) {
        await db.insert(tables.locationCategories).values({
          locationUuid: uuid,
          categoryId,
        }).onConflictDoNothing()
      }
    }

    console.log(`Seeded ${categoryInserts.length} categories, ${DUMMY_LOCATIONS.length} locations`)
  })
})

-- Category Hierarchies
-- This file defines parent-child relationships between categories
-- Enforced by triggers: child categories require their parent to exist

INSERT INTO category_hierarchies (child_id, parent_id) VALUES
  -- Restaurant hierarchies
  ('italian_restaurant', 'restaurant'),
  ('buffet_restaurant', 'restaurant'),
  ('pizza_restaurant', 'restaurant'),
  ('seafood_restaurant', 'restaurant'),
  ('sandwich_shop', 'restaurant'),

  -- Store hierarchies
  ('book_store', 'store'),
  ('cell_phone_store', 'store'),
  ('clothing_store', 'store'),
  ('department_store', 'store'),
  ('food_store', 'store'),
  ('gift_shop', 'store'),
  ('grocery_store', 'store'),
  ('home_goods_store', 'store'),
  ('jewelry_store', 'store'),
  ('shoe_store', 'store'),
  ('sporting_goods_store', 'store'),
  ('supermarket', 'store'),

  -- Lodging hierarchies (multi-level)
  ('extended_stay_hotel', 'hotel'),
  ('resort_hotel', 'hotel'),
  ('hotel', 'lodging'),
  ('guest_house', 'lodging'),

  -- Beauty/Salon hierarchies
  ('hair_salon', 'hair_care'),
  ('barber_shop', 'hair_care'),
  ('nail_salon', 'beauty_salon'),
  ('beautician', 'beauty_salon'),
  ('makeup_artist', 'beauty_salon'),

  -- Food/Drink hierarchies
  ('bagel_shop', 'bakery'),
  ('donut_shop', 'bakery'),
  ('coffee_shop', 'cafe'),
  ('ice_cream_shop', 'dessert_shop'),
  ('wine_bar', 'bar'),
  ('pub', 'bar'),

  -- Fitness/Wellness hierarchies
  ('gym', 'fitness_center'),
  ('massage', 'spa'),
  ('swimming_pool', 'fitness_center'),

  -- Sports hierarchies
  ('sports_club', 'sports_complex'),
  ('sports_coaching', 'sports_complex'),

  -- Pharmacy hierarchy
  ('drugstore', 'pharmacy'),

  -- Entertainment hierarchies
  ('water_park', 'amusement_park')
ON CONFLICT (child_id, parent_id) DO NOTHING;

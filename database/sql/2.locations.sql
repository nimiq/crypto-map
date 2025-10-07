-- Dummy location data for testing
-- Uses gen_random_uuid() for real UUID generation

WITH default_hours AS (
  SELECT 'Mo-Su 09:00-21:00'::text AS data
), seed_data(name, address, lng, lat, rating, photo, place_id, map_url, website, source) AS (
  VALUES
    ('Crypto Cafe Lugano', 'Via Nassa 5, 6900 Lugano', 8.9511, 46.0037, 4.5, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=400&fit=crop', 'ChIJ-crypto-cafe-1', 'https://maps.google.com/?cid=1', 'https://cryptocafe.example.com', 'naka'),
    ('Blockchain Hotel', 'Piazza Riforma 10, 6900 Lugano', 8.9575, 46.0074, 4.2, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop', 'ChIJ-blockchain-hotel-1', 'https://maps.google.com/?cid=2', 'https://blockchainhotel.example.com', 'bluecode'),
    ('Digital Restaurant', 'Via Cattedrale 12, 6900 Lugano', 8.9484, 46.0106, 4.8, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop', 'ChIJ-digital-restaurant-1', 'https://maps.google.com/?cid=3', NULL, 'naka'),
    ('Web3 Electronics', 'Via Pretorio 15, 6900 Lugano', 8.9622, 45.9987, 4.0, 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop', 'ChIJ-web3-shop-1', 'https://maps.google.com/?cid=4', 'https://web3shop.example.com', 'bluecode'),
    ('DeFi Bank Lugano', 'Via Soave 4, 6900 Lugano', 8.9533, 46.0055, 4.3, 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400&h=400&fit=crop', 'ChIJ-defi-bank-1', 'https://maps.google.com/?cid=5', 'https://defibank.example.com', 'naka'),
    ('NFT Gallery', 'Via Canova 18, 6900 Lugano', 8.9501, 46.0091, 4.7, 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&h=400&fit=crop', 'ChIJ-nft-gallery-1', 'https://maps.google.com/?cid=6', NULL, 'bluecode'),
    ('Satoshi Pizzeria', 'Via Magatti 9, 6900 Lugano', 8.9543, 46.0058, 4.6, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop', 'ChIJ-satoshi-pizza-1', 'https://maps.google.com/?cid=7', 'https://satoshipizza.example.com', 'naka'),
    ('Bitcoin Pharmacy', 'Corso Pestalozzi 1, 6900 Lugano', 8.9558, 46.0042, 4.1, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=400&fit=crop', 'ChIJ-bitcoin-pharmacy-1', 'https://maps.google.com/?cid=8', NULL, 'bluecode'),
    ('Crypto Fitness Gym', 'Via Geretta 2, 6900 Lugano', 8.9492, 46.0081, 4.4, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop', 'ChIJ-crypto-gym-1', 'https://maps.google.com/?cid=9', 'https://cryptofitness.example.com', 'naka'),
    ('Ethereum Bakery', 'Via Pessina 7, 6900 Lugano', 8.9567, 46.0063, 4.9, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop', 'ChIJ-ethereum-bakery-1', 'https://maps.google.com/?cid=10', NULL, 'bluecode'),
    ('NFT Clothing Store', 'Via Nizzola 2, 6900 Lugano', 8.9528, 46.0045, 4.2, 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop', 'ChIJ-nft-clothing-1', 'https://maps.google.com/?cid=11', 'https://nftclothing.example.com', 'naka'),
    ('Smart Contract Bar', 'Via Cantonale 8, 6900 Lugano', 8.9515, 46.0098, 4.5, 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=400&fit=crop', 'ChIJ-smart-bar-1', 'https://maps.google.com/?cid=12', NULL, 'bluecode'),
    ('Decentralized Bookstore', 'Via Pretorio 3, 6900 Lugano', 8.9581, 46.0071, 4.3, 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=400&fit=crop', 'ChIJ-decentral-books-1', 'https://maps.google.com/?cid=13', 'https://decentral-books.example.com', 'naka'),
    ('Blockchain Barbershop', 'Via Soave 8, 6900 Lugano', 8.9536, 46.0052, 4.7, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop', 'ChIJ-blockchain-barber-1', 'https://maps.google.com/?cid=14', NULL, 'bluecode'),
    ('Crypto Supermarket', 'Via Trevano 55, 6900 Lugano', 8.9445, 46.0015, 4.0, 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=400&fit=crop', 'ChIJ-crypto-super-1', 'https://maps.google.com/?cid=15', 'https://cryptosuper.example.com', 'naka'),
    ('Token Taxi Stand', 'Piazza Manzoni 2, 6900 Lugano', 8.9505, 46.0085, 3.9, 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=400&fit=crop', 'ChIJ-token-taxi-1', 'https://maps.google.com/?cid=16', NULL, 'bluecode'),
    ('Web3 Laundry', 'Via Canonica 14, 6900 Lugano', 8.9518, 46.0035, 4.1, 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400&h=400&fit=crop', 'ChIJ-web3-laundry-1', 'https://maps.google.com/?cid=17', 'https://web3laundry.example.com', 'naka'),
    ('Bitcoin Cinema', 'Via Pioda 5, 6900 Lugano', 8.9571, 46.0067, 4.6, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=400&fit=crop', 'ChIJ-bitcoin-cinema-1', 'https://maps.google.com/?cid=18', NULL, 'bluecode'),
    ('Smart Jewelry', 'Via Canova 9, 6900 Lugano', 8.9497, 46.0093, 4.8, 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', 'ChIJ-smart-jewelry-1', 'https://maps.google.com/?cid=19', 'https://smartjewelry.example.com', 'naka'),
    ('Decentralized Dental Clinic', 'Via Pretorio 20, 6900 Lugano', 8.9545, 46.0048, 4.4, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=400&fit=crop', 'ChIJ-decentral-dental-1', 'https://maps.google.com/?cid=20', NULL, 'bluecode')
), inserted_locations AS (
  INSERT INTO locations (uuid, name, address, location, rating, photo, gmaps_place_id, gmaps_url, website, source, timezone, opening_hours, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    name,
    address,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    rating,
    photo,
    place_id,
    map_url,
    website,
    source,
    'Europe/Zurich',
    default_hours.data,
    NOW(),
    NOW()
  FROM seed_data
  CROSS JOIN default_hours
  ON CONFLICT (gmaps_place_id) DO UPDATE SET gmaps_place_id = EXCLUDED.gmaps_place_id
  RETURNING uuid, gmaps_place_id
)
-- Insert location-category relationships using the returned UUIDs
INSERT INTO location_categories (location_uuid, category_id)
SELECT uuid, category_id
FROM inserted_locations
CROSS JOIN LATERAL (
  VALUES
    -- Crypto Cafe Lugano
    ('ChIJ-crypto-cafe-1', 'cafe'),
    ('ChIJ-crypto-cafe-1', 'coffee_shop'),
    -- Blockchain Hotel
    ('ChIJ-blockchain-hotel-1', 'lodging'),
    -- Digital Restaurant
    ('ChIJ-digital-restaurant-1', 'restaurant'),
    ('ChIJ-digital-restaurant-1', 'meal_takeaway'),
    -- Web3 Electronics
    ('ChIJ-web3-shop-1', 'electronics_store'),
    ('ChIJ-web3-shop-1', 'store'),
    -- DeFi Bank Lugano
    ('ChIJ-defi-bank-1', 'bank'),
    ('ChIJ-defi-bank-1', 'atm'),
    -- NFT Gallery
    ('ChIJ-nft-gallery-1', 'art_gallery'),
    ('ChIJ-nft-gallery-1', 'museum'),
    -- Satoshi Pizzeria
    ('ChIJ-satoshi-pizza-1', 'restaurant'),
    ('ChIJ-satoshi-pizza-1', 'meal_delivery'),
    -- Bitcoin Pharmacy
    ('ChIJ-bitcoin-pharmacy-1', 'pharmacy'),
    ('ChIJ-bitcoin-pharmacy-1', 'drugstore'),
    -- Crypto Fitness Gym
    ('ChIJ-crypto-gym-1', 'gym'),
    -- Ethereum Bakery
    ('ChIJ-ethereum-bakery-1', 'bakery'),
    ('ChIJ-ethereum-bakery-1', 'cafe'),
    -- NFT Clothing Store
    ('ChIJ-nft-clothing-1', 'clothing_store'),
    ('ChIJ-nft-clothing-1', 'store'),
    -- Smart Contract Bar
    ('ChIJ-smart-bar-1', 'bar'),
    ('ChIJ-smart-bar-1', 'night_club'),
    -- Decentralized Bookstore
    ('ChIJ-decentral-books-1', 'book_store'),
    ('ChIJ-decentral-books-1', 'store'),
    -- Blockchain Barbershop
    ('ChIJ-blockchain-barber-1', 'hair_care'),
    ('ChIJ-blockchain-barber-1', 'beauty_salon'),
    -- Crypto Supermarket
    ('ChIJ-crypto-super-1', 'supermarket'),
    ('ChIJ-crypto-super-1', 'store'),
    -- Token Taxi Stand
    ('ChIJ-token-taxi-1', 'taxi_stand'),
    -- Web3 Laundry
    ('ChIJ-web3-laundry-1', 'laundry'),
    -- Bitcoin Cinema
    ('ChIJ-bitcoin-cinema-1', 'movie_theater'),
    -- Smart Jewelry
    ('ChIJ-smart-jewelry-1', 'jewelry_store'),
    ('ChIJ-smart-jewelry-1', 'store'),
    -- Decentralized Dental Clinic
    ('ChIJ-decentral-dental-1', 'dentist'),
    ('ChIJ-decentral-dental-1', 'doctor')
) AS categories(place_id, category_id)
WHERE inserted_locations.gmaps_place_id = categories.place_id
ON CONFLICT (location_uuid, category_id) DO NOTHING;

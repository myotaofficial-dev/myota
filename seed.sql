-- ============================================================
-- MYOTA Hotel Website Builder — Production Seed Script
-- Run this in your Supabase SQL Editor to populate the database
-- ============================================================

-- 1. PROPERTIES

-- 1. PROPERTIES (Seed as 'draft' with owner_id)
INSERT INTO properties (id, name, status, owner_id) VALUES
('prop-1', 'Sri K Residency', 'draft', '11111111-1111-1111-1111-111111111111'),
('prop-2', 'The Grandlake Resorts', 'draft', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, owner_id = EXCLUDED.owner_id;


-- 2. HOTEL SETTINGS
-- Seeding Sri K Residency (prop-1)
INSERT INTO hotel_settings (
  property_id, name, subdomain, custom_domain, star_rating, phone, email, address,
  tagline, description, short_description, detailed_description,
  primary_color, secondary_color, bg_color, font_header, font_body,
  general_amenities, hero_style, hero_images, show_events, current_template
) VALUES (
  'prop-1',
  'Sri K Residency',
  'srikresidency',
  'www.srikresidency.com',
  3,
  '+91 94432 63283',
  'contact@srikresidency.com',
  'No.1 Poolampatti Road, Odakattur, Salem District, Tamil Nadu, India - 636602',
  'Your Perfect Homestay & Residency in Poolampatti',
  'Welcome to Sri K Residency, offering a comfortable, homelike stay surrounded by serene village beauty.',
  'Welcome to Sri K Residency, offering a comfortable homelike stay surrounded by serene nature.',
  'Escape to Sri K Residency, where simple comfort meets local hospitality. Located near Poolampatti, Salem, we provide clean rooms, home-cooked local meals, and peaceful green surroundings.',
  '#0284c7',
  '#1a1a1a',
  '#FFFFFF',
  'Noto Serif',
  'Mulish',
  ARRAY['Free Wi-Fi', 'Free Parking', 'Room Service', 'Power Backup', 'Housekeeping', 'Caretaker'],
  'single',
  ARRAY[
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200'
  ],
  true,
  'organic'
) ON CONFLICT (property_id) DO NOTHING;

-- Seeding The Grandlake Resorts (prop-2)
INSERT INTO hotel_settings (
  property_id, name, subdomain, custom_domain, star_rating, phone, email, address,
  tagline, description, short_description, detailed_description,
  primary_color, secondary_color, bg_color, font_header, font_body,
  general_amenities, hero_style, hero_images, show_events, current_template
) VALUES (
  'prop-2',
  'The Grandlake Resorts',
  'grandlake',
  'www.thegrandlakeresorts.com',
  4,
  '+91 98765 43210',
  'reservations@grandlakeresorts.com',
  'Killiyur Falls Road, Yercaud, Salem District, Tamil Nadu, India - 636602',
  'Escape to Kutty Kerala in Poolampatti',
  'Escape to a world where tranquillity meets luxury at The Grandlake Resorts. Nestled on the scenic hills overlooking Yercaud.',
  'Escape to a world where tranquillity meets luxury. Nestled on the scenic hills overlooking Yercaud.',
  'Escape to a world where tranquillity meets luxury at The Grandlake Resorts. Nestled on the scenic hills overlooking Yercaud, we offer custom-curated experiences, an Ayurvedic spa, and fine dining.',
  '#0284c7',
  '#1a1a1a',
  '#FFFFFF',
  'Noto Serif',
  'Mulish',
  ARRAY['Infinity Pool', 'Ayurvedic Spa', 'Fitness Center', 'Multi-cuisine Restaurant', 'Valley View Deck', 'Free Wi-Fi', 'Free Parking', 'Kids Play Area'],
  'single',
  ARRAY[
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200'
  ],
  true,
  'organic'
) ON CONFLICT (property_id) DO NOTHING;


-- 3. ROOM CATEGORIES
-- Rooms for Sri K Residency (prop-1)
INSERT INTO room_categories (
  id, property_id, name, description, size_sqft, bed_type,
  capacity_adults, capacity_children, base_price, price_tiers, total_inventory, amenities, photos
) VALUES
(
  'prop-1-room-1', 'prop-1', 'Standard A/C Room',
  'Comfortable air-conditioned room with modern amenities, clean linens and private bathroom.',
  240, 'Queen Size', 2, 1, 1800.00, '{"1": 1800, "2": 1800}'::jsonb, 5,
  ARRAY['Free Wi-Fi', 'Air Conditioning', 'Flat Screen TV', 'Toiletries'],
  ARRAY['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600']
),
(
  'prop-1-room-2', 'prop-1', 'Family Suite',
  'Spacious suite perfect for families, equipped with two double beds and green garden view.',
  450, '2 Double Beds', 4, 2, 3500.00, '{"1": 3500, "2": 3500, "3": 4000, "4": 4500}'::jsonb, 2,
  ARRAY['Free Wi-Fi', 'Air Conditioning', 'Flat Screen TV', 'Tea/Coffee Maker', 'Garden View'],
  ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600']
)
ON CONFLICT (id) DO NOTHING;

-- Rooms for The Grandlake Resorts (prop-2)
INSERT INTO room_categories (
  id, property_id, name, description, size_sqft, bed_type,
  capacity_adults, capacity_children, base_price, price_tiers, total_inventory, amenities, photos
) VALUES
(
  'room-1', 'prop-2', 'Standard Room',
  'Cozy rooms designed for couples, featuring basic modern amenities and comfortable bed configurations.',
  280, 'Queen Size', 2, 1, 90.00, '{"1": 90, "2": 90}'::jsonb, 10,
  ARRAY['Free Wi-Fi', 'Flat Screen TV', 'Tea/Coffee Maker', 'Safe Locker'],
  ARRAY['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600']
),
(
  'room-2', 'prop-2', 'Deluxe Room',
  'Elegant rooms equipped with premium linens, private balcony access, and a partial view of the gardens.',
  360, 'King Size', 2, 1, 130.00, '{"1": 130, "2": 130}'::jsonb, 15,
  ARRAY['Free Wi-Fi', 'Mini Bar', 'Flat Screen TV', 'Balcony', 'Tea/Coffee Maker'],
  ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600']
),
(
  'room-3', 'prop-2', 'Superior Balcony Room',
  'Spacious rooms on high floors offering gorgeous sunset views of the Yercaud hills and luxury fittings.',
  420, 'King Size + Single Sofa Bed', 3, 1, 170.00, '{"1": 170, "2": 170, "3": 200}'::jsonb, 8,
  ARRAY['Free Wi-Fi', 'Mini Bar', 'Air Conditioning', 'Balcony with Valley View', 'Rain Shower'],
  ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600']
)
ON CONFLICT (id) DO NOTHING;


-- 4. ADDONS
INSERT INTO addons (id, property_id, name, price, description, pricing_type, image) VALUES
('addon-1', 'prop-2', 'Birthday / Anniversary Decoration', 2000.00, 'Milestones are meant to be memorable. Celebrate with a romantic setup by the lake.', 'single_event', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=600'),
('addon-2', 'prop-2', 'Candle Light Dinner', 3500.00, 'An evening of quiet luxury, meant for just the two of you under the canopy stars.', 'single_event', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600'),
('addon-3', 'prop-2', 'Buffet Breakfast', 450.00, 'Daily organic buffet breakfast prepared from fresh local farm crops.', 'per_head', 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&q=80&w=600')
ON CONFLICT (id) DO NOTHING;


-- 5. COUPONS
INSERT INTO coupons (id, property_id, code, discount_type, discount_value, active) VALUES
('coupon-1', 'prop-2', 'WELCOME10', 'percent', 10.00, true)
ON CONFLICT (id) DO NOTHING;


-- 6. TESTIMONIALS
INSERT INTO testimonials (id, property_id, author, content, rating, stay_date) VALUES
('test-1', 'prop-2', 'Rajesh Kumar', 'Absolutely stunning property! Highly recommended.', 5, '2026-05-15')
ON CONFLICT (id) DO NOTHING;


-- 7. FAQS
INSERT INTO faqs (id, property_id, question, answer) VALUES
('faq-1', 'prop-2', 'What are check-in and check-out timings?', 'Standard check-in is 2:00 PM and check-out is 11:00 AM.')
ON CONFLICT (id) DO NOTHING;


-- 8. POLICIES
INSERT INTO policies (id, property_id, title, description) VALUES
('pol-1', 'prop-2', 'Cancellation Policy', 'Free cancellation up to 48 hours prior to check-in.')
ON CONFLICT (id) DO NOTHING;


-- 9. CUSTOM PAGES
INSERT INTO custom_pages (id, property_id, title, slug, content, active, page_type, banner_image, tagline, restaurant_menu) VALUES
(
  'page-1',
  'prop-2',
  'Dining',
  'dining',
  'Enjoy organic, local specialties curated by our master chefs.',
  true,
  'restaurant',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200',
  'Farm-to-Table Gastronomy',
  '[
    {"name": "Organic Garden Salad", "price": 12.00, "description": "Fresh greens, heirloom tomatoes, and cucumber from our garden, drizzled with house balsamic.", "photo": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=300"},
    {"name": "Clay Oven Roasted Paneer", "price": 18.00, "description": "Paneer cubes marinated in yogurt and organic spices, grilled in our tandoor.", "photo": "https://images.unsplash.com/photo-1567188040759-fb8a883db6d8?auto=format&fit=crop&q=80&w=300"},
    {"name": "Spiced Yercaud Tea & Scones", "price": 8.00, "description": "Local spice tea served with warm, freshly baked buttermilk scones and fruit preserves.", "photo": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=300"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

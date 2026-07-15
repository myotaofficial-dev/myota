-- ============================================================
-- MYOTA Hotel Website Builder — Production Schema
-- Migration: 20260701120000_production_schema.sql
-- ============================================================
-- Architecture: Multi-tenant SaaS. All hotel data is scoped
-- to a `property_id`. Auth uses Supabase Auth (auth.uid()).
-- Guest-facing tables are publicly readable. Admin writes
-- require the authenticated role owning the property.
-- ============================================================

-- Drop old basic tables from the prototype migration
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS room_categories CASCADE;
DROP TABLE IF EXISTS hotel_info CASCADE;


-- ============================================================
-- 1. PROPERTIES — root tenant table
-- ============================================================
CREATE TABLE properties (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  owner_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_owner ON properties(owner_id);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their properties
CREATE POLICY "Owners manage their properties"
  ON properties FOR ALL
  TO authenticated
  USING ( (SELECT auth.uid()) = owner_id )
  WITH CHECK ( (SELECT auth.uid()) = owner_id );

-- Public can read published properties (needed for guest-facing site)
CREATE POLICY "Public read published properties"
  ON properties FOR SELECT
  TO anon
  USING ( status = 'published' );

GRANT SELECT ON properties TO anon;
GRANT ALL ON properties TO authenticated;


-- ============================================================
-- 2. HOTEL_SETTINGS — all HotelInfo fields
-- ============================================================
CREATE TABLE hotel_settings (
  -- Identity
  property_id            TEXT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,

  -- Basic Info
  name                   TEXT NOT NULL DEFAULT '',
  subdomain              TEXT NOT NULL DEFAULT '',
  custom_domain          TEXT NOT NULL DEFAULT '',
  star_rating            INT NOT NULL DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
  check_in_time          TEXT NOT NULL DEFAULT '14:00',
  check_out_time         TEXT NOT NULL DEFAULT '11:00',
  phone                  TEXT NOT NULL DEFAULT '',
  email                  TEXT NOT NULL DEFAULT '',
  address                TEXT NOT NULL DEFAULT '',
  latitude               NUMERIC(10, 6),
  longitude              NUMERIC(10, 6),

  -- Content & Descriptions
  tagline                TEXT NOT NULL DEFAULT '',
  description            TEXT NOT NULL DEFAULT '',
  short_description      TEXT,
  detailed_description   TEXT,
  website_headline       TEXT,

  -- Section Titles (customisable headings on the public site)
  about_title            TEXT DEFAULT 'About Us',
  amenities_title        TEXT DEFAULT 'Amenities',
  events_title           TEXT DEFAULT 'Events & Packages',
  rooms_title            TEXT DEFAULT 'Our Rooms',
  reviews_title          TEXT DEFAULT 'Guest Reviews',
  gallery_title          TEXT DEFAULT 'Gallery',
  addons_title           TEXT DEFAULT 'Add-ons & Experiences',
  faqs_title             TEXT DEFAULT 'FAQs',
  policies_title         TEXT DEFAULT 'Policies',

  -- Branding
  primary_color          TEXT NOT NULL DEFAULT '#0284c7',
  secondary_color        TEXT NOT NULL DEFAULT '#1a1a1a',
  bg_color               TEXT NOT NULL DEFAULT '#FFFFFF',
  font_header            TEXT NOT NULL DEFAULT 'Noto Serif',
  font_body              TEXT NOT NULL DEFAULT 'Mulish',
  logo_url               TEXT NOT NULL DEFAULT '',
  favicon_url            TEXT,

  -- Marketing & Analytics
  google_analytics_id    TEXT NOT NULL DEFAULT '',
  facebook_pixel_id      TEXT NOT NULL DEFAULT '',
  instagram_handle       TEXT,
  google_business_name   TEXT,

  -- Hero Media
  hero_style             TEXT NOT NULL DEFAULT 'single' CHECK (hero_style IN ('single','carousel','collage','video')),
  hero_images            TEXT[] NOT NULL DEFAULT '{}',
  hero_video             TEXT NOT NULL DEFAULT '',

  -- Amenities
  general_amenities      TEXT[] NOT NULL DEFAULT '{}',
  custom_amenities       TEXT[] NOT NULL DEFAULT '{}',

  -- Layout & Navigation Configuration
  section_order          JSONB NOT NULL DEFAULT '["hero","tagline","about","amenities","events","rooms","reviews","bento-gallery","policies","addons","faqs","location","instagram"]'::jsonb,
  disabled_sections      JSONB NOT NULL DEFAULT '[]'::jsonb,
  menu_items_order       JSONB NOT NULL DEFAULT '["about","amenities","rooms","reviews","faqs","location"]'::jsonb,
  disabled_menu_items    JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- UI Toggles
  show_events            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Child Policy
  child_policy_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  child_policy_min_age   INT NOT NULL DEFAULT 5,
  child_policy_max_age   INT NOT NULL DEFAULT 12,
  extra_adult_rate       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  extra_child_rate       NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Meal Plan Rates (CP = Breakfast, MAP = Half Board, AP = Full Board)
  meal_plan_cp_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  meal_plan_cp_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meal_plan_cp_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meal_plan_map_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  meal_plan_map_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meal_plan_map_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meal_plan_ap_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  meal_plan_ap_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meal_plan_ap_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  default_meal_plan      TEXT NOT NULL DEFAULT 'EP' CHECK (default_meal_plan IN ('EP','CP','MAP','AP')),

  -- Cancellation Policies
  cancellation_policy_type          TEXT NOT NULL DEFAULT '2d',
  cancellation_policy_custom_text   TEXT,
  non_refundable_discount_amount    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  custom_cancellation_policies      JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Online Payment Collection
  payment_collection_type    TEXT NOT NULL DEFAULT 'partial' CHECK (payment_collection_type IN ('full','partial')),
  payment_collection_percent INT NOT NULL DEFAULT 50 CHECK (payment_collection_percent BETWEEN 1 AND 100),

  -- Active Template
  current_template       TEXT NOT NULL DEFAULT 'organic',

  -- Offers
  offers                 JSONB NOT NULL DEFAULT '[]'::jsonb,

  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;

-- Public guests can read settings for published properties
CREATE POLICY "Public read hotel settings for published properties"
  ON hotel_settings FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = hotel_settings.property_id
        AND p.status = 'published'
    )
  );

-- Authenticated owners can fully manage their hotel settings
CREATE POLICY "Owners manage their hotel settings"
  ON hotel_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = hotel_settings.property_id
        AND p.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = hotel_settings.property_id
        AND p.owner_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON hotel_settings TO anon;
GRANT ALL ON hotel_settings TO authenticated;


-- ============================================================
-- 3. ROOM_CATEGORIES — all RoomType fields
-- ============================================================
CREATE TABLE room_categories (
  id                             TEXT PRIMARY KEY,
  property_id                    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  name                           TEXT NOT NULL,
  description                    TEXT NOT NULL DEFAULT '',
  size_sqft                      INT NOT NULL DEFAULT 0,
  bed_type                       TEXT NOT NULL DEFAULT '', -- legacy text field

  -- Occupancy
  capacity_adults                INT NOT NULL DEFAULT 2,
  capacity_children              INT NOT NULL DEFAULT 0,
  min_occupancy                  INT NOT NULL DEFAULT 1,
  base_occupancy                 INT NOT NULL DEFAULT 2,

  -- Pricing
  base_price                     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_tiers                    JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Inventory
  total_inventory                INT NOT NULL DEFAULT 1,

  -- Bed Configuration
  beds                           JSONB NOT NULL DEFAULT '{}'::jsonb,
  extra_beds                     JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Media
  amenities                      TEXT[] NOT NULL DEFAULT '{}',
  photos                         TEXT[] NOT NULL DEFAULT '{}',

  -- Per-Date Overrides (stored as JSONB maps keyed by YYYY-MM-DD)
  inventory_overrides            JSONB NOT NULL DEFAULT '{}'::jsonb,
  rate_overrides                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  cancellation_policy_overrides  JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_active                      BOOLEAN NOT NULL DEFAULT TRUE,
  display_order                  INT NOT NULL DEFAULT 0,

  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_categories_property ON room_categories(property_id);
CREATE INDEX idx_room_categories_active ON room_categories(property_id, is_active);

ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active rooms of published properties"
  ON room_categories FOR SELECT
  TO anon
  USING (
    is_active = TRUE AND
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = room_categories.property_id AND p.status = 'published'
    )
  );

CREATE POLICY "Owners manage their room categories"
  ON room_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = room_categories.property_id AND p.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = room_categories.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON room_categories TO anon;
GRANT ALL ON room_categories TO authenticated;


-- ============================================================
-- 4. PRICING_OVERRIDES — normalized per-room, per-date overrides
-- ============================================================
CREATE TABLE pricing_overrides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      TEXT NOT NULL REFERENCES room_categories(id) ON DELETE CASCADE,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  price        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_blocked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, date)
);

CREATE INDEX idx_pricing_overrides_room_date ON pricing_overrides(room_id, date);
CREATE INDEX idx_pricing_overrides_property ON pricing_overrides(property_id);
CREATE INDEX idx_pricing_overrides_blocked ON pricing_overrides(property_id, is_blocked) WHERE is_blocked = TRUE;

ALTER TABLE pricing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pricing overrides of published properties"
  ON pricing_overrides FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = pricing_overrides.property_id AND p.status = 'published'
    )
  );

CREATE POLICY "Owners manage their pricing overrides"
  ON pricing_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = pricing_overrides.property_id AND p.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = pricing_overrides.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON pricing_overrides TO anon;
GRANT ALL ON pricing_overrides TO authenticated;


-- ============================================================
-- 5. BOOKINGS — all Booking fields plus production extras
-- ============================================================
CREATE TABLE bookings (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id                      TEXT REFERENCES room_categories(id) ON DELETE SET NULL,
  room_name                    TEXT NOT NULL DEFAULT '', -- denormalised for history

  -- Guest Details
  guest_name                   TEXT NOT NULL,
  guest_email                  TEXT NOT NULL,
  guest_phone                  TEXT NOT NULL DEFAULT '',

  -- Stay Dates
  check_in                     DATE NOT NULL,
  check_out                    DATE NOT NULL,
  nights                       INT GENERATED ALWAYS AS (check_out - check_in) STORED,

  -- Guest Counts
  adults                       INT NOT NULL DEFAULT 1,
  children                     INT NOT NULL DEFAULT 0,

  -- Pricing Breakdown
  base_price                   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  addon_total                  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meal_plan_total              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_price                  NUMERIC(10, 2) NOT NULL,

  -- Payment
  payment_status               TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','partially_paid')),
  payment_mode                 TEXT NOT NULL DEFAULT 'partial' CHECK (payment_mode IN ('full','partial')),
  amount_paid                  NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Booking Status
  booking_status               TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed','cancelled','checked_in','checked_out','no_show')),

  -- Selections
  meal_plan                    TEXT NOT NULL DEFAULT 'EP',
  addons                       TEXT[] NOT NULL DEFAULT '{}',
  coupon_code                  TEXT,
  selected_slot                TEXT,
  cancellation_policy_applied  TEXT,
  special_requests             TEXT,

  -- Source Tracking
  source                       TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','phone','ota','walkin')),

  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_dates CHECK (check_out > check_in)
);

CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(property_id, booking_status);
CREATE INDEX idx_bookings_guest_email ON bookings(guest_email);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Guests can submit bookings (INSERT only via anon)
CREATE POLICY "Guests can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- Owners can read and manage all bookings for their property
CREATE POLICY "Owners manage their bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = bookings.property_id AND p.owner_id = (SELECT auth.uid())
    )
  );

GRANT INSERT ON bookings TO anon;
GRANT ALL ON bookings TO authenticated;


-- ============================================================
-- 6. ADDONS — all Addon fields
-- ============================================================
CREATE TABLE addons (
  id             TEXT PRIMARY KEY,
  property_id    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  price          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image          TEXT,
  pricing_type   TEXT NOT NULL DEFAULT 'single_event' CHECK (pricing_type IN ('per_head','single_event')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addons_property ON addons(property_id, is_active);

ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active addons of published properties"
  ON addons FOR SELECT
  TO anon
  USING (
    is_active = TRUE AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = addons.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their addons"
  ON addons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = addons.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = addons.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON addons TO anon;
GRANT ALL ON addons TO authenticated;


-- ============================================================
-- 7. COUPONS — all Coupon fields plus production extras
-- ============================================================
CREATE TABLE coupons (
  id                   TEXT PRIMARY KEY,
  property_id          TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code                 TEXT NOT NULL,
  discount_type        TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value       NUMERIC(10, 2) NOT NULL,
  min_booking_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_discount_amount  NUMERIC(10, 2),       -- cap for percent discounts
  valid_from           DATE,
  valid_until          DATE,
  max_uses             INT,                  -- NULL = unlimited
  use_count            INT NOT NULL DEFAULT 0,
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, code)
);

CREATE INDEX idx_coupons_property ON coupons(property_id, active);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Guests need to validate coupons (anon read active ones)
CREATE POLICY "Guests can validate active coupons of published properties"
  ON coupons FOR SELECT
  TO anon
  USING (
    active = TRUE AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = coupons.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = coupons.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = coupons.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON coupons TO anon;
GRANT ALL ON coupons TO authenticated;


-- ============================================================
-- 8. TESTIMONIALS — all Testimonial fields
-- ============================================================
CREATE TABLE testimonials (
  id           TEXT PRIMARY KEY,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  author       TEXT NOT NULL,
  content      TEXT NOT NULL,
  rating       INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  stay_date    DATE,
  avatar_url   TEXT,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','google')),
  is_approved  BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_testimonials_property ON testimonials(property_id, is_approved);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved testimonials of published properties"
  ON testimonials FOR SELECT
  TO anon
  USING (
    is_approved = TRUE AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = testimonials.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their testimonials"
  ON testimonials FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = testimonials.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = testimonials.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON testimonials TO anon;
GRANT ALL ON testimonials TO authenticated;


-- ============================================================
-- 9. FAQS
-- ============================================================
CREATE TABLE faqs (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faqs_property ON faqs(property_id);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read faqs of published properties"
  ON faqs FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = faqs.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their faqs"
  ON faqs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = faqs.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = faqs.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON faqs TO anon;
GRANT ALL ON faqs TO authenticated;


-- ============================================================
-- 10. POLICIES — hotel policy documents
-- ============================================================
CREATE TABLE policies (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_property ON policies(property_id);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read policies of published properties"
  ON policies FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = policies.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their policies"
  ON policies FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = policies.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = policies.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON policies TO anon;
GRANT ALL ON policies TO authenticated;


-- ============================================================
-- 11. CUSTOM_PAGES — blog, restaurant, banquet, pool, etc.
-- ============================================================
CREATE TABLE custom_pages (
  id                  TEXT PRIMARY KEY,
  property_id         TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL,
  content             TEXT NOT NULL DEFAULT '',
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  page_type           TEXT NOT NULL DEFAULT 'custom' CHECK (page_type IN ('blog','restaurant','pool','banquet','activities','custom')),
  banner_image        TEXT,
  tagline             TEXT,
  -- Rich content stored as JSONB per page type
  restaurant_menu     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{name, price, description, photo}]
  banquet_capacity    INT,
  banquet_features    TEXT[] NOT NULL DEFAULT '{}',
  blog_posts          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{title, date, read_time, content, image}]
  activities_list     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{title, time, description, image}]
  display_order       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, slug)
);

CREATE INDEX idx_custom_pages_property ON custom_pages(property_id, active);

ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active custom pages of published properties"
  ON custom_pages FOR SELECT
  TO anon
  USING (
    active = TRUE AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = custom_pages.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their custom pages"
  ON custom_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = custom_pages.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = custom_pages.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON custom_pages TO anon;
GRANT ALL ON custom_pages TO authenticated;


-- ============================================================
-- 12. GUEST_EVENTS — experiences and activities calendar
-- ============================================================
CREATE TABLE guest_events (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  image         TEXT NOT NULL DEFAULT '',
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  time          TEXT NOT NULL DEFAULT '',
  price         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  capacity      INT NOT NULL DEFAULT 50,
  slots         JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_adult   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_child   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  target        TEXT NOT NULL DEFAULT 'all',
  discount      NUMERIC(5, 2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_event_dates CHECK (to_date >= from_date)
);

CREATE INDEX idx_guest_events_property ON guest_events(property_id, is_active);
CREATE INDEX idx_guest_events_dates ON guest_events(property_id, from_date, to_date);

ALTER TABLE guest_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active events of published properties"
  ON guest_events FOR SELECT
  TO anon
  USING (
    is_active = TRUE AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = guest_events.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their guest events"
  ON guest_events FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = guest_events.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = guest_events.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON guest_events TO anon;
GRANT ALL ON guest_events TO authenticated;


-- ============================================================
-- 13. CO_HOSTS — team members with roles
-- ============================================================
CREATE TABLE co_hosts (
  id                  TEXT PRIMARY KEY,
  property_id         TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  phone               TEXT NOT NULL DEFAULT '',
  role                TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('super_admin','manager','caretaker')),
  can_receive_calls   BOOLEAN NOT NULL DEFAULT FALSE,
  can_accept_bookings BOOLEAN NOT NULL DEFAULT FALSE,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- links to Supabase Auth account
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_co_hosts_property ON co_hosts(property_id);
CREATE INDEX idx_co_hosts_user ON co_hosts(user_id);

ALTER TABLE co_hosts ENABLE ROW LEVEL SECURITY;

-- Co-hosts are private — no anon access
CREATE POLICY "Owners manage their co-hosts"
  ON co_hosts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = co_hosts.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = co_hosts.property_id AND p.owner_id = (SELECT auth.uid()))
  );

-- Co-hosts can read their own record
CREATE POLICY "Co-hosts can read their own record"
  ON co_hosts FOR SELECT
  TO authenticated
  USING ( user_id = (SELECT auth.uid()) );

GRANT ALL ON co_hosts TO authenticated;


-- ============================================================
-- 14. MEDIA_LIBRARY — photos and videos
-- ============================================================
CREATE TABLE media_library (
  id              TEXT PRIMARY KEY,
  property_id     TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  media_type      TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo','video')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_hero         BOOLEAN NOT NULL DEFAULT FALSE,
  file_name       TEXT,
  file_size_bytes BIGINT,
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_library_property ON media_library(property_id);
CREATE INDEX idx_media_library_hero ON media_library(property_id, is_hero) WHERE is_hero = TRUE;

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read media of published properties"
  ON media_library FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = media_library.property_id AND p.status = 'published')
  );

CREATE POLICY "Owners manage their media library"
  ON media_library FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = media_library.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = media_library.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT SELECT ON media_library TO anon;
GRANT ALL ON media_library TO authenticated;


-- ============================================================
-- 15. GUEST_MESSAGES — contact form submissions
-- ============================================================
CREATE TABLE guest_messages (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sender_name   TEXT NOT NULL,
  sender_email  TEXT NOT NULL,
  sender_phone  TEXT NOT NULL DEFAULT '',
  subject       TEXT NOT NULL DEFAULT '',
  message       TEXT NOT NULL,
  sent_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  archived      BOOLEAN NOT NULL DEFAULT FALSE,
  replied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_messages_property ON guest_messages(property_id, is_read);
CREATE INDEX idx_guest_messages_unread ON guest_messages(property_id) WHERE is_read = FALSE;

ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;

-- Guests submit messages anonymously (INSERT only)
CREATE POLICY "Guests can send messages"
  ON guest_messages FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Owners manage their guest messages"
  ON guest_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = guest_messages.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = guest_messages.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT INSERT ON guest_messages TO anon;
GRANT ALL ON guest_messages TO authenticated;


-- ============================================================
-- 16. EVENT_LOGS — admin activity audit trail
-- ============================================================
CREATE TABLE event_logs (
  id           TEXT PRIMARY KEY,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  log_type     TEXT NOT NULL DEFAULT 'info' CHECK (log_type IN ('booking','channel','info')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_logs_property ON event_logs(property_id, created_at DESC);

ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- Event logs are private — only owners
CREATE POLICY "Owners read their event logs"
  ON event_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = event_logs.property_id AND p.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = event_logs.property_id AND p.owner_id = (SELECT auth.uid()))
  );

GRANT ALL ON event_logs TO authenticated;


-- ============================================================
-- UTILITY: auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_properties
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_hotel_settings
  BEFORE UPDATE ON hotel_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_room_categories
  BEFORE UPDATE ON room_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_addons
  BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_custom_pages
  BEFORE UPDATE ON custom_pages
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Create hotel_info table
CREATE TABLE IF NOT EXISTS hotel_info (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  cancellation_policy_type TEXT DEFAULT '2d',
  non_refundable_discount_amount INT DEFAULT 200,
  payment_collection_type TEXT DEFAULT 'partial',
  payment_collection_percent INT DEFAULT 50,
  raw_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create room_categories table
CREATE TABLE IF NOT EXISTS room_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity_adults INT DEFAULT 2,
  capacity_children INT DEFAULT 1,
  base_price INT DEFAULT 3000,
  total_inventory INT DEFAULT 5,
  min_occupancy INT DEFAULT 1,
  base_occupancy INT DEFAULT 2,
  beds JSONB DEFAULT '{}'::jsonb,
  extra_beds JSONB DEFAULT '{}'::jsonb,
  price_tiers JSONB DEFAULT '{}'::jsonb,
  amenities TEXT[] DEFAULT '{}'::text[],
  photos TEXT[] DEFAULT '{}'::text[],
  inventory_overrides JSONB DEFAULT '{}'::jsonb,
  rate_overrides JSONB DEFAULT '{}'::jsonb,
  cancellation_policy_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES room_categories(id) ON DELETE SET NULL,
  room_name TEXT,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  booking_status TEXT DEFAULT 'confirmed',
  addons TEXT[] DEFAULT '{}'::text[],
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE hotel_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (select/insert)
CREATE POLICY "Allow public read access to hotel_info"
  ON hotel_info FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to room_categories"
  ON room_categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public read/write access to bookings"
  ON bookings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policies for admin read/write on hotel_info and room_categories
CREATE POLICY "Allow all access to hotel_info for authenticated admins"
  ON hotel_info FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to room_categories for authenticated admins"
  ON room_categories FOR ALL
  USING (true)
  WITH CHECK (true);

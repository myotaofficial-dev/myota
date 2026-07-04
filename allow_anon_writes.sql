-- ============================================================
-- MYOTA Hotel Website Builder — RLS Policies for Development
-- Run this in your Supabase SQL Editor to allow anon client writes
-- ============================================================

-- 1. PROPERTIES
DROP POLICY IF EXISTS "Owners manage their properties" ON properties;
DROP POLICY IF EXISTS "Public read published properties" ON properties;
DROP POLICY IF EXISTS "Development public full access" ON properties;
CREATE POLICY "Development public full access" ON properties FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. HOTEL_SETTINGS
DROP POLICY IF EXISTS "Public read hotel settings for published properties" ON hotel_settings;
DROP POLICY IF EXISTS "Owners manage their hotel settings" ON hotel_settings;
DROP POLICY IF EXISTS "Development public full access" ON hotel_settings;
CREATE POLICY "Development public full access" ON hotel_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON hotel_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. ROOM_CATEGORIES
DROP POLICY IF EXISTS "Public read active rooms of published properties" ON room_categories;
DROP POLICY IF EXISTS "Owners manage their room categories" ON room_categories;
DROP POLICY IF EXISTS "Development public full access" ON room_categories;
CREATE POLICY "Development public full access" ON room_categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON room_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. PRICING_OVERRIDES
DROP POLICY IF EXISTS "Public read pricing overrides of published properties" ON pricing_overrides;
DROP POLICY IF EXISTS "Owners manage their pricing overrides" ON pricing_overrides;
DROP POLICY IF EXISTS "Development public full access" ON pricing_overrides;
CREATE POLICY "Development public full access" ON pricing_overrides FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON pricing_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. BOOKINGS
DROP POLICY IF EXISTS "Guests can create bookings" ON bookings;
DROP POLICY IF EXISTS "Owners manage their bookings" ON bookings;
DROP POLICY IF EXISTS "Development public full access" ON bookings;
CREATE POLICY "Development public full access" ON bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. ADDONS
DROP POLICY IF EXISTS "Public read active addons of published properties" ON addons;
DROP POLICY IF EXISTS "Owners manage their addons" ON addons;
DROP POLICY IF EXISTS "Development public full access" ON addons;
CREATE POLICY "Development public full access" ON addons FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON addons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. COUPONS
DROP POLICY IF EXISTS "Guests can validate active coupons of published properties" ON coupons;
DROP POLICY IF EXISTS "Owners manage their coupons" ON coupons;
DROP POLICY IF EXISTS "Development public full access" ON coupons;
CREATE POLICY "Development public full access" ON coupons FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. TESTIMONIALS
DROP POLICY IF EXISTS "Public read approved testimonials of published properties" ON testimonials;
DROP POLICY IF EXISTS "Owners manage their testimonials" ON testimonials;
DROP POLICY IF EXISTS "Development public full access" ON testimonials;
CREATE POLICY "Development public full access" ON testimonials FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON testimonials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. FAQS
DROP POLICY IF EXISTS "Public read faqs of published properties" ON faqs;
DROP POLICY IF EXISTS "Owners manage their faqs" ON faqs;
DROP POLICY IF EXISTS "Development public full access" ON faqs;
CREATE POLICY "Development public full access" ON faqs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON faqs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. POLICIES
DROP POLICY IF EXISTS "Public read policies of published properties" ON policies;
DROP POLICY IF EXISTS "Owners manage their policies" ON policies;
DROP POLICY IF EXISTS "Development public full access" ON policies;
CREATE POLICY "Development public full access" ON policies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. CUSTOM_PAGES
DROP POLICY IF EXISTS "Public read active custom pages of published properties" ON custom_pages;
DROP POLICY IF EXISTS "Owners manage their custom pages" ON custom_pages;
DROP POLICY IF EXISTS "Development public full access" ON custom_pages;
CREATE POLICY "Development public full access" ON custom_pages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON custom_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. GUEST_EVENTS
DROP POLICY IF EXISTS "Public read active events of published properties" ON guest_events;
DROP POLICY IF EXISTS "Owners manage their guest events" ON guest_events;
DROP POLICY IF EXISTS "Development public full access" ON guest_events;
CREATE POLICY "Development public full access" ON guest_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON guest_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. CO_HOSTS
DROP POLICY IF EXISTS "Owners manage their co-hosts" ON co_hosts;
DROP POLICY IF EXISTS "Co-hosts can read their own record" ON co_hosts;
DROP POLICY IF EXISTS "Development public full access" ON co_hosts;
CREATE POLICY "Development public full access" ON co_hosts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON co_hosts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 14. MEDIA_LIBRARY
DROP POLICY IF EXISTS "Public read media of published properties" ON media_library;
DROP POLICY IF EXISTS "Owners manage their media library" ON media_library;
DROP POLICY IF EXISTS "Development public full access" ON media_library;
CREATE POLICY "Development public full access" ON media_library FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON media_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. GUEST_MESSAGES
DROP POLICY IF EXISTS "Development public full access" ON guest_messages;
CREATE POLICY "Development public full access" ON guest_messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON guest_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 16. EVENT_LOGS
DROP POLICY IF EXISTS "Development public full access" ON event_logs;
CREATE POLICY "Development public full access" ON event_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated public full access" ON event_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

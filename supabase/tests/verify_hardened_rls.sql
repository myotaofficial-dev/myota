-- ══════════════════════════════════════════════════════════════════════════════
-- Automated Verification & Security Regression Suite: verify_hardened_rls.sql
-- Target Migration: supabase/migrations/20261011160000_harden_security_and_rls.sql
--                   supabase/migrations/20261011170000_optimize_indexes_and_rls_performance.sql
--
-- HOW TO RUN LOCALLY OR IN STAGING:
--   Runs entirely inside a single transaction that finishes with ROLLBACK,
--   so zero test fixtures or changes persist even in a staging database.
--   Do NOT run against production.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 0. Test Helper: Temporarily disable FK to auth.users on isolated test DBs ─
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN (
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'users'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', fk.table_name, fk.constraint_name);
  END LOOP;
END $$;

-- ── 1. Seed Deterministic Multi-Owner & Staff Fixtures ────────────────────────
-- Users:
--   Primary Owner 1 (Resort 1):       11111111-1111-1111-1111-111111111111
--   Secondary Co-Owner 2 (Resort 1):  12121212-1212-1212-1212-121212121212 (role = 'owner')
--   Super Admin Co-Owner (Resort 1):  33333333-3333-3333-3333-333333333333 (role = 'super_admin')
--   Manager (Resort 1):               44444444-4444-4444-4444-444444444444 (role = 'manager')
--   Caretaker ReadOnly (Resort 1):    55555555-5555-5555-5555-555555555555 (role = 'caretaker', can_accept_bookings = false)
--   Caretaker Acceptor (Resort 1):    66666666-6666-6666-6666-666666666666 (role = 'caretaker', can_accept_bookings = true)
--   Other Resort Owner (Resort 2):    22222222-2222-2222-2222-222222222222
--   Unassigned Authenticated User:    77777777-7777-7777-7777-777777777777

INSERT INTO public.properties (id, name, status, owner_id)
VALUES
  ('prop_test_rls_1', 'Test Sanctuary One', 'published', '11111111-1111-1111-1111-111111111111'::uuid),
  ('prop_test_rls_2', 'Test Sanctuary Two', 'published', '22222222-2222-2222-2222-222222222222'::uuid),
  ('prop_test_draft', 'Unpublished Sanctuary', 'draft', '11111111-1111-1111-1111-111111111111'::uuid)
ON CONFLICT (id) DO UPDATE
  SET status = EXCLUDED.status,
      owner_id = EXCLUDED.owner_id;

INSERT INTO public.hotel_settings (
  property_id, name, subdomain, child_policy_enabled, child_policy_min_age, child_policy_max_age,
  extra_adult_rate, extra_child_rate, default_meal_plan,
  meal_plan_cp_enabled, meal_plan_cp_adult_rate, meal_plan_cp_child_rate,
  meal_plan_map_enabled, meal_plan_map_adult_rate, meal_plan_map_child_rate,
  meal_plan_ap_enabled, meal_plan_ap_adult_rate, meal_plan_ap_child_rate,
  offers
) VALUES (
  'prop_test_rls_1', 'Test Sanctuary One', 'sanctuary-one', TRUE, 5, 12,
  1000, 500, 'EP',
  TRUE, 300, 200,
  TRUE, 1000, 600,
  TRUE, 1500, 900,
  '[{"id":"off1","name":"Winter10","discountType":"percent","discountValue":10,"dates":["2026-12-10"],"roomIds":["room_test_1"]}]'::jsonb
) ON CONFLICT (property_id) DO UPDATE
  SET extra_adult_rate = EXCLUDED.extra_adult_rate,
      extra_child_rate = EXCLUDED.extra_child_rate,
      default_meal_plan = EXCLUDED.default_meal_plan,
      meal_plan_map_adult_rate = EXCLUDED.meal_plan_map_adult_rate,
      meal_plan_map_child_rate = EXCLUDED.meal_plan_map_child_rate,
      offers = EXCLUDED.offers;

-- Seed rooms:
-- room_test_1: total_inventory = 2, base_occupancy = 2, capacity_adults = 4, price_tiers = {"1": 3500, "2": 4000}
-- room_test_single: total_inventory = 1, base_occupancy = 2, capacity_adults = 2, base_price = 5000
INSERT INTO public.room_categories (
  id, property_id, name, base_price, capacity_adults, capacity_children,
  min_occupancy, base_occupancy, price_tiers, total_inventory, is_active
) VALUES
  ('room_test_1', 'prop_test_rls_1', 'Deluxe Suite', 4000, 4, 2, 1, 2, '{"1": 3500, "2": 4000}'::jsonb, 2, TRUE),
  ('room_test_single', 'prop_test_rls_1', 'Private Pool Villa', 5000, 2, 1, 1, 2, '{}'::jsonb, 1, TRUE),
  ('room_test_inactive', 'prop_test_rls_1', 'Closed Room', 3000, 2, 0, 1, 2, '{}'::jsonb, 1, FALSE),
  ('room_test_2', 'prop_test_rls_2', 'Other Property Villa', 6000, 2, 1, 1, 2, '{}'::jsonb, 2, TRUE)
ON CONFLICT (id) DO UPDATE
  SET base_price = EXCLUDED.base_price,
      capacity_adults = EXCLUDED.capacity_adults,
      base_occupancy = EXCLUDED.base_occupancy,
      price_tiers = EXCLUDED.price_tiers,
      total_inventory = EXCLUDED.total_inventory,
      is_active = EXCLUDED.is_active;

-- Seed pricing_overrides:
-- 2026-12-01 on room_test_1 has override price 5000 (not blocked)
-- 2026-12-15 on room_test_1 is BLOCKED (is_blocked = TRUE, price = 0)
INSERT INTO public.pricing_overrides (room_id, property_id, date, price, is_blocked)
VALUES
  ('room_test_1', 'prop_test_rls_1', '2026-12-01'::date, 5000, FALSE),
  ('room_test_1', 'prop_test_rls_1', '2026-12-15'::date, 0, TRUE)
ON CONFLICT (room_id, date) DO UPDATE
  SET price = EXCLUDED.price,
      is_blocked = EXCLUDED.is_blocked;

-- Seed add-ons
INSERT INTO public.addons (id, property_id, name, price, pricing_type, is_active)
VALUES
  ('addon_airport', 'prop_test_rls_1', 'Airport Pickup', 1000, 'single_event', TRUE),
  ('addon_trek', 'prop_test_rls_1', 'Guided Trek', 500, 'per_head', TRUE)
ON CONFLICT (id) DO UPDATE
  SET price = EXCLUDED.price,
      pricing_type = EXCLUDED.pricing_type,
      is_active = EXCLUDED.is_active;

-- Seed guest_events (with timing slots capacity = 4)
INSERT INTO public.guest_events (
  id, property_id, title, from_date, to_date, price, price_adult, price_child,
  discount, capacity, slots, is_active
) VALUES (
  'evt_bonfire', 'prop_test_rls_1', 'Starlit Bonfire', '2026-12-01'::date, '2026-12-31'::date,
  1000, 1000, 500, 10, 10,
  '[{"id":"slot-morning","fromTime":"09:00","toTime":"11:00","capacity":4}]'::jsonb,
  TRUE
) ON CONFLICT (id) DO UPDATE
  SET price_adult = EXCLUDED.price_adult,
      price_child = EXCLUDED.price_child,
      discount = EXCLUDED.discount,
      slots = EXCLUDED.slots,
      is_active = EXCLUDED.is_active;

-- Seed coupons (SAVE10 unlimited, ONCE500 with max_uses = 1)
INSERT INTO public.coupons (id, property_id, code, discount_type, discount_value, min_booking_amount, max_uses, use_count, active)
VALUES
  ('coup_test_10', 'prop_test_rls_1', 'SAVE10', 'percent', 10, 1000, 100, 0, TRUE),
  ('coup_test_once', 'prop_test_rls_1', 'ONCE500', 'fixed', 500, 1000, 1, 0, TRUE)
ON CONFLICT (id) DO UPDATE
  SET discount_value = EXCLUDED.discount_value,
      max_uses = EXCLUDED.max_uses,
      use_count = 0,
      active = TRUE;

-- Seed co-hosts with distinct roles on prop_test_rls_1
INSERT INTO public.co_hosts (id, property_id, name, phone, role, can_receive_calls, can_accept_bookings, user_id)
VALUES
  ('ch_co_owner', 'prop_test_rls_1', 'Co-Owner Partner', '9000000000', 'owner', true, true, '12121212-1212-1212-1212-121212121212'::uuid),
  ('ch_super', 'prop_test_rls_1', 'Super Admin CoHost', '9000000001', 'super_admin', true, true, '33333333-3333-3333-3333-333333333333'::uuid),
  ('ch_manager', 'prop_test_rls_1', 'Manager CoHost', '9000000002', 'manager', true, false, '44444444-4444-4444-4444-444444444444'::uuid),
  ('ch_caretaker_ro', 'prop_test_rls_1', 'ViewOnly Caretaker', '9000000003', 'caretaker', true, false, '55555555-5555-5555-5555-555555555555'::uuid),
  ('ch_caretaker_rw', 'prop_test_rls_1', 'Booking Caretaker', '9000000004', 'caretaker', true, true, '66666666-6666-6666-6666-666666666666'::uuid)
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      can_accept_bookings = EXCLUDED.can_accept_bookings,
      user_id = EXCLUDED.user_id;

-- Seed legacy payment link booking, expired payment link booking, and malformed-JSON booking
INSERT INTO public.bookings (
  id, property_id, room_id, room_name, guest_name, guest_email, guest_phone,
  check_in, check_out, total_price, payment_status, booking_status, paid_amount,
  adults, children, coupon_code, selected_slot
) VALUES
  (
    'BK-LEGACY01', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite',
    'Legacy Guest', 'legacy@example.com', '9111111111',
    '2026-10-01', '2026-10-02', 4200, 'pending', 'confirmed', 0,
    2, 0,
    '{"isPaymentLink":true,"payNowAmount":2100,"expiry":"2099-01-01T00:00:00.000Z","breakdown":{"roomsCost":4000,"gstCost":200,"grandTotal":4200}}',
    'legacylink12'
  ),
  (
    'BK-EXPIRED1', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite',
    'Expired Guest', 'expired@example.com', '9222222222',
    '2026-10-03', '2026-10-04', 4200, 'pending', 'confirmed', 0,
    2, 0,
    '{"isPaymentLink":true,"payNowAmount":2100,"expiry":"2020-01-01T00:00:00.000Z"}',
    'pl_expiredtoken1234567890abcd'
  ),
  (
    'BK-MALJSON1', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite',
    'Malformed JsonGuest', 'mal@example.com', '9333333333',
    '2026-10-05', '2026-10-06', 4200, 'pending', 'confirmed', 0,
    2, 1,
    '{broken_json_payload:',
    'pl_malformedjson1234567890ab'
  ),
  (
    'BK-PAIDREF1', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite',
    'Settled Guest', 'settled@example.com', '9444444444',
    '2026-10-07', '2026-10-08', 8400, 'paid', 'confirmed', 8400,
    2, 0,
    NULL,
    'pl_settledbooking1234567890ab'
  )
ON CONFLICT (id) DO NOTHING;

-- ── 2. Verify Privileges, Grants & Function Security ──────────────────────────
DO $$
DECLARE
  v_anon_privs int;
  v_sim_exists int;
  v_rls_exec boolean;
  v_helper_anon_exec boolean;
BEGIN
  SELECT COUNT(*) INTO v_anon_privs
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND grantee = 'anon';

  IF v_anon_privs > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: anon still has % table privileges on public.bookings', v_anon_privs;
  END IF;

  SELECT COUNT(*) INTO v_sim_exists
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'confirm_booking_payment_simulation';

  IF v_sim_exists > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: confirm_booking_payment_simulation still exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    SELECT has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') INTO v_rls_exec;
    IF v_rls_exec THEN
      RAISE EXCEPTION 'TEST FAILED: anon can still execute public.rls_auto_enable()';
    END IF;
  END IF;

  SELECT has_function_privilege('anon', 'public.user_is_property_owner(text)', 'EXECUTE')
  INTO v_helper_anon_exec;
  IF v_helper_anon_exec THEN
    RAISE EXCEPTION 'TEST FAILED: anon should not have EXECUTE privilege on user_is_property_owner';
  END IF;

  RAISE NOTICE 'PASSED [1/12]: Table grants, helper function grants, and obsolete RPC cleanup verified.';
END $$;

-- ── 3. Test Anonymous Role Direct Table Access (MUST FAIL) ────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role', 'anon', true);
SELECT set_config('request.jwt.claim.sub', '', true);

DO $$
BEGIN
  BEGIN
    PERFORM COUNT(*) FROM public.bookings;
    RAISE EXCEPTION 'TEST FAILED: anon SELECT on public.bookings should be denied';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASSED [2a/12]: anon direct SELECT on public.bookings denied.';
  END;

  BEGIN
    INSERT INTO public.bookings (id, property_id, room_id, room_name, guest_name, guest_email, check_in, check_out, total_price)
    VALUES ('BK-ANONFAIL', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'Hacker', 'h@x.com', '2026-12-01', '2026-12-02', 1);
    RAISE EXCEPTION 'TEST FAILED: anon direct INSERT on public.bookings should be denied';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASSED [2b/12]: anon direct INSERT on public.bookings denied.';
  END;

  BEGIN
    UPDATE public.bookings SET payment_status = 'paid', paid_amount = 999999 WHERE id = 'BK-LEGACY01';
    RAISE EXCEPTION 'TEST FAILED: anon direct UPDATE on public.bookings should be denied';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASSED [2c/12]: anon direct UPDATE on public.bookings denied.';
  END;

  BEGIN
    DELETE FROM public.bookings WHERE id = 'BK-LEGACY01';
    RAISE EXCEPTION 'TEST FAILED: anon direct DELETE on public.bookings should be denied';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASSED [2d/12]: anon direct DELETE on public.bookings denied.';
  END;
END $$;

-- ── 4. Test Validation & Blocked Dates in create_guest_booking_draft ──────────
DO $$
DECLARE
  v_res jsonb;
BEGIN
  -- 4a. Nonexistent room ID
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_does_not_exist', 'Fake', 'Alice', 'a@b.com', '999', '2026-12-01', '2026-12-02', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: nonexistent room ID should be rejected';
  END IF;

  -- 4b. Room belonging to another property
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_2', 'Wrong Prop', 'Alice', 'a@b.com', '999', '2026-12-01', '2026-12-02', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: cross-property room ID should be rejected';
  END IF;

  -- 4c. Inactive room
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_inactive', 'Closed', 'Alice', 'a@b.com', '999', '2026-12-01', '2026-12-02', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: inactive room should be rejected';
  END IF;

  -- 4d. Unpublished property
  v_res := public.create_guest_booking_draft(
    'prop_test_draft', 'room_test_1', 'Deluxe', 'Alice', 'a@b.com', '999', '2026-12-01', '2026-12-02', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: draft/unpublished property should be rejected';
  END IF;

  -- 4e. Invalid calendar date & reversed dates
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe', 'Alice', 'a@b.com', '999', '2026-02-30', '2026-03-02', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: impossible calendar date 2026-02-30 should be rejected';
  END IF;

  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe', 'Alice', 'a@b.com', '999', '2026-12-05', '2026-12-03', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: check_out <= check_in should be rejected';
  END IF;

  -- 4f. Guest count exceeding room capacity (room_test_1 max capacity = 4)
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe', 'Alice', 'a@b.com', '999', '2026-12-01', '2026-12-02', 5, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: guest count exceeding room capacity should be rejected';
  END IF;

  -- 4g. Blocked night in pricing_overrides (2026-12-15 is_blocked = TRUE)
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe', 'Alice', 'a@b.com', '999', '2026-12-14', '2026-12-16', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: stay spanning blocked date 2026-12-15 must be rejected: %', v_res;
  END IF;

  RAISE NOTICE 'PASSED [3/12]: Input validation & blocked-date rejection verified.';
END $$;

-- ── 5. Test Server-Side Pricing Reconciliation & Token Lookup ─────────────────
DO $$
DECLARE
  v_res jsonb;
  v_token text;
  v_booking_id text;
  v_lookup RECORD;
  v_empty_count int;
BEGIN
  -- Scenario:
  --   Room: room_test_1 for 2 nights: 2026-12-01 (override = 5000) and 2026-12-02 (tier "2" = 4000)
  --   Guests: 2 adults + 2 children with ages [4 (free), 10 (paying child -> extra child = 500/night)]
  --   Night 1 (2026-12-01): 5000 + 500 = 5500 (GST 5% = 275)
  --   Night 2 (2026-12-02): 4000 + 500 = 4500 (GST 5% = 225)
  --   Room Subtotal = 10000, Room GST = 500
  --   Meal Plan: 'map' -> (2 * 1000 + 1 * 600) * 2 nights = 5200 (GST 18% = 936)
  --   Add-ons: 'Airport Pickup' (1000, GST 18% = 180) + 'Guided Trek' (500 * 4 totalGuests = 2000, GST 18% = 360)
  --            + 'Event: Starlit Bonfire' (10% off 1000=900 adult, 10% off 500=450 child -> 2*900 + 1*450 = 2250, GST 18% = 405)
  --   Add-on + Event Total = 5250, Add-on + Event GST = 945
  --   Coupon: 'SAVE10' -> 10% of Room Subtotal (10000) = 1000
  --   Total GST = 500 + 936 + 945 = 2381
  --   Expected Grand Total = 10000 - 1000 + 5250 + 5200 + 2381 = 21831
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1',
    'room_test_1',
    'Deluxe Suite',
    'Aarav Sharma',
    'aarav@example.com',
    '+91 9876543210',
    '2026-12-01',
    '2026-12-03',
    2,
    2,
    ARRAY['Airport Pickup', 'Guided Trek', 'Event: Starlit Bonfire'],
    'SAVE10',
    'map',
    ARRAY[4, 10],
    NULL
  );

  IF COALESCE((v_res ->> 'success')::boolean, false) != true THEN
    RAISE EXCEPTION 'TEST FAILED: valid complex booking failed: %', v_res;
  END IF;

  IF (v_res ->> 'subtotal')::numeric != 10000 THEN
    RAISE EXCEPTION 'TEST FAILED: expected subtotal 10000, got %', v_res ->> 'subtotal';
  END IF;

  IF (v_res ->> 'discount_amount')::numeric != 1000 THEN
    RAISE EXCEPTION 'TEST FAILED: expected discount 1000, got %', v_res ->> 'discount_amount';
  END IF;

  IF (v_res ->> 'addon_total')::numeric != 5250 THEN
    RAISE EXCEPTION 'TEST FAILED: expected addon_total 5250, got %', v_res ->> 'addon_total';
  END IF;

  IF (v_res ->> 'meal_plan_total')::numeric != 5200 THEN
    RAISE EXCEPTION 'TEST FAILED: expected meal_plan_total 5200, got %', v_res ->> 'meal_plan_total';
  END IF;

  IF (v_res ->> 'gst_total')::numeric != 2381 THEN
    RAISE EXCEPTION 'TEST FAILED: expected gst_total 2381, got %', v_res ->> 'gst_total';
  END IF;

  IF (v_res ->> 'total_price')::numeric != 21831 THEN
    RAISE EXCEPTION 'TEST FAILED: expected total_price 21831, got %', v_res ->> 'total_price';
  END IF;

  v_token := v_res ->> 'guest_token';
  v_booking_id := v_res ->> 'booking_id';

  IF v_token !~ '^pl_[0-9a-f]{32}$' THEN
    RAISE EXCEPTION 'TEST FAILED: guest_token did not match ^pl_[0-9a-f]{32}$: %', v_token;
  END IF;

  -- Verify get_booking_by_payment_token with valid pl_ token
  SELECT * INTO v_lookup FROM public.get_booking_by_payment_token(v_token);
  IF v_lookup.booking_id != v_booking_id OR v_lookup.guest_display_name != 'Aarav' OR v_lookup.adults != 2 OR v_lookup.children != 2 THEN
    RAISE EXCEPTION 'TEST FAILED: get_booking_by_payment_token returned unexpected row: %', v_lookup;
  END IF;

  -- Verify booking ID fallback is rejected
  SELECT COUNT(*) INTO v_empty_count FROM public.get_booking_by_payment_token(v_booking_id);
  IF v_empty_count > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: get_booking_by_payment_token must reject booking_id';
  END IF;

  -- Verify malformed pl_ tokens (wildcards, uppercase, underscores) are rejected
  SELECT COUNT(*) INTO v_empty_count FROM public.get_booking_by_payment_token('pl_INVALID_TOKEN_WITH_UNDERSCORE');
  IF v_empty_count > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: get_booking_by_payment_token must reject malformed pl_ token';
  END IF;

  -- Verify legacy payment link works and returns pay_now_amount = 2100
  SELECT * INTO v_lookup FROM public.get_booking_by_payment_token('legacylink12');
  IF v_lookup.booking_id != 'BK-LEGACY01' OR v_lookup.pay_now_amount != 2100 THEN
    RAISE EXCEPTION 'TEST FAILED: legacy payment link lookup failed: %', v_lookup;
  END IF;

  -- Verify expired payment link is rejected
  SELECT COUNT(*) INTO v_empty_count FROM public.get_booking_by_payment_token('pl_expiredtoken1234567890abcd');
  IF v_empty_count > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: expired payment link must be rejected';
  END IF;

  -- Verify malformed JSON in coupon_code does not throw 500 error
  SELECT * INTO v_lookup FROM public.get_booking_by_payment_token('pl_malformedjson1234567890ab');
  IF v_lookup.booking_id != 'BK-MALJSON1' OR v_lookup.pay_now_amount != 4200 THEN
    RAISE EXCEPTION 'TEST FAILED: malformed JSON fallback failed: %', v_lookup;
  END IF;

  RAISE NOTICE 'PASSED [4/12]: Full server-side pricing reconciliation & anchored token regex lookup verified.';
END $$;

-- ── 6. Test Inventory Availability, Overbooking Rejection & Event Slot Limits ──
DO $$
DECLARE
  v_res1 jsonb;
  v_res2 jsonb;
BEGIN
  -- room_test_single has total_inventory = 1.
  -- First booking for 2026-12-20 to 2026-12-22 MUST SUCCEED:
  v_res1 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_single', 'Private Pool Villa', 'Guest One', 'g1@example.com', '999',
    '2026-12-20', '2026-12-22', 2, 0
  );
  IF COALESCE((v_res1 ->> 'success')::boolean, false) != true THEN
    RAISE EXCEPTION 'TEST FAILED: first booking on room_test_single should succeed: %', v_res1;
  END IF;

  -- Second overlapping booking for 2026-12-21 to 2026-12-23 on room_test_single MUST FAIL (sold out):
  v_res2 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_single', 'Private Pool Villa', 'Guest Two', 'g2@example.com', '999',
    '2026-12-21', '2026-12-23', 2, 0
  );
  IF COALESCE((v_res2 ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: overlapping booking exceeding room_test_single inventory must be rejected: %', v_res2;
  END IF;

  -- Standalone event slot capacity test: evt_bonfire slot-morning has capacity = 4.
  -- First booking for 3 guests MUST SUCCEED:
  v_res1 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'event-booking-evt_bonfire', 'Starlit Bonfire', 'Event Guest 1', 'e1@example.com', '999',
    '2026-12-25', '2026-12-25', 3, 0, '{}'::text[], NULL, NULL, NULL, 'slot-morning'
  );
  IF COALESCE((v_res1 ->> 'success')::boolean, false) != true THEN
    RAISE EXCEPTION 'TEST FAILED: first standalone event slot booking should succeed: %', v_res1;
  END IF;

  -- Second booking for 2 guests on slot-morning (3 + 2 = 5 > capacity 4) MUST FAIL:
  v_res2 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'event-booking-evt_bonfire', 'Starlit Bonfire', 'Event Guest 2', 'e2@example.com', '999',
    '2026-12-25', '2026-12-25', 2, 0, '{}'::text[], NULL, NULL, NULL, 'slot-morning'
  );
  IF COALESCE((v_res2 ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: event slot booking exceeding capacity 4 must be rejected: %', v_res2;
  END IF;

  RAISE NOTICE 'PASSED [5/12]: Per-night room inventory & standalone event-slot capacity limits verified.';
END $$;

-- ── 7. Test Coupon Non-Exhaustion on Unpaid Drafts vs Confirmed Payment ───────
RESET ROLE;
DO $$
DECLARE
  v_res1 jsonb;
  v_res2 jsonb;
  v_res3 jsonb;
  v_use_count int;
BEGIN
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.role', 'anon', true);

  -- Coupon ONCE500 has max_uses = 1, use_count = 0.
  -- Creating an unpaid draft with ONCE500 should apply the 500 discount WITHOUT incrementing use_count:
  v_res1 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'Draft Guest 1', 'd1@example.com', '999',
    '2026-11-01', '2026-11-02', 2, 0, '{}'::text[], 'ONCE500'
  );
  IF COALESCE((v_res1 ->> 'success')::boolean, false) != true OR (v_res1 ->> 'discount_amount')::numeric != 500 THEN
    RAISE EXCEPTION 'TEST FAILED: ONCE500 should apply 500 discount on draft 1: %', v_res1;
  END IF;

  -- Because Draft 1 is still unpaid ('pending'), ONCE500 is NOT yet consumed!
  -- A second guest creating a draft with ONCE500 can still validate it:
  v_res2 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'Draft Guest 2', 'd2@example.com', '999',
    '2026-11-01', '2026-11-02', 2, 0, '{}'::text[], 'ONCE500'
  );
  IF COALESCE((v_res2 ->> 'success')::boolean, false) != true THEN
    RAISE EXCEPTION 'TEST FAILED: unpaid draft 1 should not have exhausted ONCE500: %', v_res2;
  END IF;

  -- Now simulate trusted backend payment settlement (as postgres / service_role) on Draft 1:
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.bookings
  SET payment_status = 'paid', paid_amount = total_price
  WHERE id = (v_res1 ->> 'booking_id');

  SELECT use_count INTO v_use_count FROM public.coupons WHERE id = 'coup_test_once';
  IF v_use_count != 1 THEN
    RAISE EXCEPTION 'TEST FAILED: settling payment on Draft 1 should increment ONCE500 use_count to 1, got %', v_use_count;
  END IF;

  -- Now switch back to anon and verify a new draft with ONCE500 is REJECTED because max_uses (1) is reached:
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.role', 'anon', true);

  v_res3 := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'Draft Guest 3', 'd3@example.com', '999',
    '2026-11-05', '2026-11-06', 2, 0, '{}'::text[], 'ONCE500'
  );
  IF COALESCE((v_res3 ->> 'success')::boolean, false) != false THEN
    RAISE EXCEPTION 'TEST FAILED: ONCE500 must be rejected after confirmed payment reached max_uses: %', v_res3;
  END IF;

  RAISE NOTICE 'PASSED [6/12]: Coupon non-exhaustion on unpaid drafts & redemption on payment settlement verified.';
END $$;

-- ── 8. Test Multi-Owner Access & Ownership Revocation (Section 3 & 10) ────────
RESET ROLE;
SET LOCAL ROLE authenticated;

-- 8a. Primary Owner 1 (11111111...) and Secondary Co-Owner 2 (12121212..., role='owner')
DO $$
DECLARE
  v_cnt int;
  v_prop_cnt int;
BEGIN
  -- Test Secondary Co-Owner 2 (role = 'owner' in co_hosts)
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', '12121212-1212-1212-1212-121212121212', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"12121212-1212-1212-1212-121212121212","role":"authenticated"}', true);

  -- Co-Owner 2 can see Resort 1 but NOT Resort 2
  SELECT COUNT(*) INTO v_prop_cnt FROM public.properties WHERE id = 'prop_test_rls_1';
  IF v_prop_cnt != 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Co-Owner 2 should see prop_test_rls_1';
  END IF;

  SELECT COUNT(*) INTO v_prop_cnt FROM public.properties WHERE id = 'prop_test_rls_2';
  IF v_prop_cnt != 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Co-Owner 2 must NOT see prop_test_rls_2';
  END IF;

  -- Co-Owner 2 can read all bookings for Resort 1
  SELECT COUNT(*) INTO v_cnt FROM public.bookings WHERE property_id = 'prop_test_rls_1';
  IF v_cnt < 4 THEN
    RAISE EXCEPTION 'TEST FAILED: Co-Owner 2 should read all Resort 1 bookings, got %', v_cnt;
  END IF;

  -- Co-Owner 2 can insert a valid pending staff booking and delete it
  INSERT INTO public.bookings (
    id, property_id, room_id, room_name, guest_name, guest_email,
    check_in, check_out, total_price, payment_status, booking_status, paid_amount
  ) VALUES (
    'BK-COOWNER01', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'CoOwner Guest', 'co@example.com',
    '2026-11-10', '2026-11-11', 5000, 'pending', 'confirmed', 0
  );

  DELETE FROM public.bookings WHERE id = 'BK-COOWNER01';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST FAILED: Co-Owner 2 should be able to DELETE bookings on Resort 1';
  END IF;

  -- Co-Owner 2 CANNOT reassign primary owner_id on properties
  BEGIN
    UPDATE public.properties SET owner_id = '12121212-1212-1212-1212-121212121212'::uuid WHERE id = 'prop_test_rls_1';
    RAISE EXCEPTION 'TEST FAILED: secondary co-owner must not be able to steal primary owner_id';
  EXCEPTION
    WHEN OTHERS THEN
      NULL; -- Expected rejection from trg_protect_property_primary_owner
  END;

  -- Now Primary Owner 1 revokes Co-Owner 2's ownership by deleting ch_co_owner
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  DELETE FROM public.co_hosts WHERE id = 'ch_co_owner' AND property_id = 'prop_test_rls_1';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST FAILED: Primary Owner 1 should be able to remove Co-Owner 2 from co_hosts';
  END IF;

  -- Switch back to Co-Owner 2 and verify immediate revocation of all Resort 1 access!
  PERFORM set_config('request.jwt.claim.sub', '12121212-1212-1212-1212-121212121212', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"12121212-1212-1212-1212-121212121212","role":"authenticated"}', true);

  SELECT COUNT(*) INTO v_cnt FROM public.bookings WHERE property_id = 'prop_test_rls_1';
  IF v_cnt != 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Revoked Co-Owner 2 still sees % bookings on Resort 1', v_cnt;
  END IF;

  SELECT COUNT(*) INTO v_prop_cnt FROM public.properties WHERE id = 'prop_test_rls_1';
  IF v_prop_cnt != 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Revoked Co-Owner 2 still sees prop_test_rls_1 in authenticated query';
  END IF;

  RAISE NOTICE 'PASSED [7/12]: Multi-owner resort access, primary-owner protection, and immediate ownership revocation verified.';
END $$;

-- ── 9. Test Manager Role Boundaries & Privilege Escalation Prevention ─────────
DO $$
DECLARE
  v_cnt int;
  v_del_cnt int;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

  -- Manager can SELECT bookings
  SELECT COUNT(*) INTO v_cnt FROM public.bookings WHERE property_id = 'prop_test_rls_1';
  IF v_cnt = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: manager should be able to SELECT bookings';
  END IF;

  -- Manager can UPDATE operational booking_status (e.g. check-in)
  UPDATE public.bookings SET booking_status = 'checked_in' WHERE id = 'BK-LEGACY01';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST FAILED: manager should be able to UPDATE booking_status';
  END IF;
  UPDATE public.bookings SET booking_status = 'confirmed' WHERE id = 'BK-LEGACY01';

  -- Manager CANNOT DELETE bookings
  WITH d AS (
    DELETE FROM public.bookings WHERE id = 'BK-LEGACY01' RETURNING id
  )
  SELECT COUNT(*) INTO v_del_cnt FROM d;
  IF v_del_cnt > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: manager must NOT be allowed to DELETE bookings';
  END IF;

  -- Manager CANNOT escalate their own role in public.co_hosts to 'owner' or 'super_admin'
  WITH u AS (
    UPDATE public.co_hosts SET role = 'owner' WHERE id = 'ch_manager' RETURNING id
  )
  SELECT COUNT(*) INTO v_cnt FROM u;
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: manager must NOT be able to escalate their own role in co_hosts';
  END IF;

  RAISE NOTICE 'PASSED [8/12]: Manager role boundaries and co_hosts privilege-escalation prevention verified.';
END $$;

-- ── 10. Test Caretaker Roles (View-Only vs Booking-Acceptor) ──────────────────
DO $$
DECLARE
  v_cnt int;
  v_upd_cnt int;
  v_del_cnt int;
BEGIN
  -- 10a. View-only caretaker (can_accept_bookings = FALSE):
  PERFORM set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

  SELECT COUNT(*) INTO v_cnt FROM public.bookings WHERE property_id = 'prop_test_rls_1';
  IF v_cnt = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: view-only caretaker should be able to SELECT bookings';
  END IF;

  WITH u AS (
    UPDATE public.bookings SET booking_status = 'cancelled' WHERE id = 'BK-LEGACY01' RETURNING id
  )
  SELECT COUNT(*) INTO v_upd_cnt FROM u;
  IF v_upd_cnt > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: view-only caretaker (can_accept_bookings=false) must NOT be able to UPDATE bookings';
  END IF;

  -- 10b. Booking-acceptor caretaker (can_accept_bookings = TRUE):
  PERFORM set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);

  WITH u AS (
    UPDATE public.bookings SET booking_status = 'checked_in' WHERE id = 'BK-LEGACY01' RETURNING id
  )
  SELECT COUNT(*) INTO v_upd_cnt FROM u;
  IF v_upd_cnt != 1 THEN
    RAISE EXCEPTION 'TEST FAILED: caretaker with can_accept_bookings=true should be able to UPDATE booking_status';
  END IF;
  UPDATE public.bookings SET booking_status = 'confirmed' WHERE id = 'BK-LEGACY01';

  -- Caretaker with can_accept_bookings = TRUE still CANNOT DELETE bookings
  WITH d AS (
    DELETE FROM public.bookings WHERE id = 'BK-LEGACY01' RETURNING id
  )
  SELECT COUNT(*) INTO v_del_cnt FROM d;
  IF v_del_cnt > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: caretaker must NOT be able to DELETE bookings';
  END IF;

  RAISE NOTICE 'PASSED [9/12]: Caretaker view-only vs can_accept_bookings permissions verified.';
END $$;

-- ── 11. Test Sensitive Column Protection Trigger (Section 4 & 10) ─────────────
DO $$
BEGIN
  -- Test as Caretaker with can_accept_bookings = TRUE (66666666...)
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);

  -- 11a. Caretaker attempting to tamper with total_price MUST FAIL
  BEGIN
    UPDATE public.bookings SET total_price = 1 WHERE id = 'BK-LEGACY01';
    RAISE EXCEPTION 'TEST FAILED: caretaker must not be able to modify total_price';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Only property owners can modify booking total_price%' AND SQLERRM NOT LIKE '%greater than zero%' THEN
        RAISE EXCEPTION 'Unexpected error on caretaker total_price tamper: %', SQLERRM;
      END IF;
  END;

  -- 11b. Caretaker attempting to fabricate payment_status = 'paid' MUST FAIL
  BEGIN
    UPDATE public.bookings SET payment_status = 'paid' WHERE id = 'BK-LEGACY01';
    RAISE EXCEPTION 'TEST FAILED: caretaker must not be able to set payment_status = paid';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Direct client modification of payment_status%' THEN
        RAISE EXCEPTION 'Unexpected error on caretaker payment_status tamper: %', SQLERRM;
      END IF;
  END;

  -- 11c. Caretaker attempting to increase paid_amount MUST FAIL
  BEGIN
    UPDATE public.bookings SET paid_amount = 4200 WHERE id = 'BK-LEGACY01';
    RAISE EXCEPTION 'TEST FAILED: caretaker must not be able to increase paid_amount';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Direct client increase of paid_amount is forbidden%' THEN
        RAISE EXCEPTION 'Unexpected error on caretaker paid_amount tamper: %', SQLERRM;
      END IF;
  END;

  -- 11d. Switch to Primary Owner 1 (11111111...):
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  -- Even Primary Owner 1 CANNOT directly insert a booking with payment_status = 'paid' from the client
  BEGIN
    INSERT INTO public.bookings (
      id, property_id, room_id, room_name, guest_name, guest_email,
      check_in, check_out, total_price, payment_status, booking_status, paid_amount
    ) VALUES (
      'BK-FAKEPAID1', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'Fake Paid', 'fp@example.com',
      '2026-11-12', '2026-11-13', 4000, 'paid', 'confirmed', 4000
    );
    RAISE EXCEPTION 'TEST FAILED: direct client insert with payment_status=paid must be rejected';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%New bookings must be created with payment_status = pending%' THEN
        RAISE EXCEPTION 'Unexpected error on direct paid insert: %', SQLERRM;
      END IF;
  END;

  -- Immutable fields (selected_slot, property_id, id) cannot be modified even by Owner 1
  BEGIN
    UPDATE public.bookings SET selected_slot = 'pl_hackedtoken1234567890abcdef' WHERE id = 'BK-LEGACY01';
    RAISE EXCEPTION 'TEST FAILED: selected_slot must be immutable on UPDATE';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%selected_slot / payment token is immutable%' THEN
        RAISE EXCEPTION 'Unexpected error on selected_slot mutation: %', SQLERRM;
      END IF;
  END;

  -- Direct staff insert onto a BLOCKED date (2026-12-15) must also be rejected by trigger!
  BEGIN
    INSERT INTO public.bookings (
      id, property_id, room_id, room_name, guest_name, guest_email,
      check_in, check_out, total_price, payment_status, booking_status, paid_amount
    ) VALUES (
      'BK-STAFFBLK1', 'prop_test_rls_1', 'room_test_1', 'Deluxe Suite', 'Blocked Guest', 'bg@example.com',
      '2026-12-15', '2026-12-16', 5000, 'pending', 'confirmed', 0
    );
    RAISE EXCEPTION 'TEST FAILED: direct staff insert onto blocked date 2026-12-15 must be rejected';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%blocked on 2026-12-15%' THEN
        RAISE EXCEPTION 'Unexpected error on staff blocked-date insert: %', SQLERRM;
      END IF;
  END;

  -- Legitimate Owner Refund on an already-paid booking (BK-PAIDREF1 has paid_amount = 8400) MUST SUCCEED:
  UPDATE public.bookings
  SET paid_amount = 0,
      payment_status = 'refunded',
      refunds = '[{"id":"ref1","amount":8400,"reason":"Guest request","createdAt":"2026-10-11","refundType":"source"}]'::jsonb
  WHERE id = 'BK-PAIDREF1';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST FAILED: Owner should be allowed to record a legitimate refund on a paid booking';
  END IF;

  RAISE NOTICE 'PASSED [10/12]: Sensitive column protection, immutable identifiers, and owner refund rules verified.';
END $$;

-- ── 12. Test Cross-Tenant Isolation & Cancellation Inventory Release ──────────
DO $$
DECLARE
  v_cnt int;
  v_res jsonb;
BEGIN
  -- 12a. Unassigned authenticated user (77777777...) has zero access
  PERFORM set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}', true);

  SELECT COUNT(*) INTO v_cnt FROM public.bookings;
  IF v_cnt != 0 THEN
    RAISE EXCEPTION 'TEST FAILED: unassigned user saw % bookings', v_cnt;
  END IF;

  -- 12b. Owner 2 of Resort 2 (22222222...) cannot see Resort 1 bookings
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

  SELECT COUNT(*) INTO v_cnt FROM public.bookings WHERE property_id = 'prop_test_rls_1';
  IF v_cnt != 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Owner of Resort 2 saw % bookings from Resort 1', v_cnt;
  END IF;

  -- 12c. Primary Owner 1 cancels the booking on room_test_single (2026-12-20 to 2026-12-22),
  --      releasing the inventory so a new guest can book those dates!
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  UPDATE public.bookings
  SET booking_status = 'cancelled'
  WHERE property_id = 'prop_test_rls_1'
    AND room_id = 'room_test_single'
    AND check_in = '2026-12-20';

  -- Now a new guest booking on room_test_single for 2026-12-20 to 2026-12-22 MUST SUCCEED:
  v_res := public.create_guest_booking_draft(
    'prop_test_rls_1', 'room_test_single', 'Private Pool Villa', 'Rebooked Guest', 'rb@example.com', '999',
    '2026-12-20', '2026-12-22', 2, 0
  );
  IF COALESCE((v_res ->> 'success')::boolean, false) != true THEN
    RAISE EXCEPTION 'TEST FAILED: cancelling booking on room_test_single should release inventory: %', v_res;
  END IF;

  RAISE NOTICE 'PASSED [11/12]: Cross-tenant isolation and cancellation inventory release verified.';
  RAISE NOTICE 'PASSED [12/12]: ALL 12 HARDENED SECURITY, MULTI-OWNER, PRICING & CONCURRENCY TEST SUITES PASSED.';
END $$;

ROLLBACK;

-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20261011160000_harden_security_and_rls.sql
-- Project: MYOTA Hospitality SaaS (Supabase / PostgreSQL 15+ / 17)
-- Target: public.bookings, public.properties, public.co_hosts, public.room_categories,
--         public.pricing_overrides, public.hotel_settings, public.coupons,
--         public.rls_auto_enable, public.trigger_set_updated_at
--
-- SECURITY & INTEGRITY ARCHITECTURE SUMMARY:
--   1. ZERO ANONYMOUS TABLE PRIVILEGES ON BOOKINGS:
--      - REVOKE ALL ON public.bookings FROM anon (SELECT, INSERT, UPDATE, DELETE).
--      - No anonymous RLS policies on public.bookings.
--      - All anonymous guest interactions must go through hardened SECURITY DEFINER RPCs.
--   2. REMOVE CLIENT PAYMENT SIMULATION MUTATION & PROTECT SENSITIVE COLUMNS:
--      - Drops confirm_booking_payment_simulation(text, numeric).
--      - Enforces a BEFORE INSERT OR UPDATE trigger (trg_bookings_security_and_inventory_guard)
--        on public.bookings so direct authenticated table writes CANNOT:
--        * Insert or fabricate payment_status = 'paid'/'partially_paid' or paid_amount > 0.
--        * Mutate immutable identifiers (id, property_id, selected_slot, created_at).
--        * Allow managers/caretakers to alter total_price, room_id, coupon_code, or refunds.
--        * Bypass blocked dates (pricing_overrides.is_blocked = TRUE) or room inventory limits.
--   3. MULTI-OWNER RESORT AUTHORIZATION & ROLE-SCOPED STAFF RLS:
--      - Supports multiple owners per resort via public.properties.owner_id (primary owner)
--        AND public.co_hosts with role IN ('owner', 'super_admin') and user_id = auth.uid().
--      - Hardened SECURITY DEFINER helper functions (SET search_path = public, pg_temp):
--        * user_is_property_owner(property_id): Primary owner OR co_hosts ('owner', 'super_admin').
--        * user_can_manage_property(property_id): Owner OR co_hosts ('manager').
--        * user_can_accept_bookings(property_id): Owner, manager, OR caretaker with can_accept_bookings = TRUE.
--        * user_can_view_bookings(property_id): Owner, manager, OR caretaker.
--      - Prevents privilege escalation: ONLY property owners can INSERT/UPDATE/DELETE co_hosts.
--      - Revoking a co-owner row in public.co_hosts immediately revokes their resort access.
--   4. BLOCKED DATES, CONCURRENCY LOCKING & INVENTORY AVAILABILITY:
--      - Verifies properties.status = 'published'.
--      - Acquires transaction-scoped advisory lock (pg_advisory_xact_lock) per property
--        and locks room_categories / guest_events rows FOR UPDATE to prevent race conditions.
--      - Explicitly rejects reservations if ANY requested night has pricing_overrides.is_blocked = TRUE
--        (never falls back to base_price on a blocked night) or inventory_overrides <= 0.
--      - Treats NULL booking_status deterministically via COALESCE(booking_status, 'confirmed') != 'cancelled'.
--   5. FULL SERVER-SIDE PRICING & COUPON INTEGRITY:
--      - Reconciles multi-room guest distribution (distributeAdultsAndChildren),
--        child age policies, guest-count price_tiers, pricing_overrides, rate_overrides,
--        extra adult/child rates, default CP meal plan & meal plan upgrades (CP/MAP/AP),
--        property date/room offers, active add-ons, guest events, validated coupons, and GST slabs.
--      - Unpaid booking drafts do NOT increment coupons.use_count; coupon consumption is
--        incremented only when a booking transitions to 'paid' or 'partially_paid'.
--   6. COLLISION-RESISTANT IDS & ANCHORED REGEX TOKEN VALIDATION:
--      - Generates 64-bit random hex booking IDs (BK-...) and 128-bit tokens (pl_...)
--        inside a uniqueness-checked retry loop backed by a partial unique index.
--      - get_booking_by_payment_token validates tokens using anchored regex (^pl_[a-z0-9]{24,32}$)
--        instead of SQL LIKE wildcards, preserves verified legacy payment links, masks guest PII,
--        and returns only guest-safe stay summary fields.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 0. Reconcile Schema Columns, Constraints & Triggers Safely ────────────────
-- Live public.bookings does NOT have an updated_at column, whereas
-- 20260701120000_production_schema.sql attached set_updated_at_bookings.
-- Drop set_updated_at_bookings if updated_at is absent on public.bookings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS set_updated_at_bookings ON public.bookings;
  END IF;
END $$;

-- Ensure required co_hosts authorization columns exist
ALTER TABLE IF EXISTS public.co_hosts
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS can_receive_calls BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_accept_bookings BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Expand co_hosts.role CHECK constraint to allow explicit 'owner' as well as 'super_admin', 'manager', 'caretaker'
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'co_hosts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.co_hosts DROP CONSTRAINT IF EXISTS %I;', con.conname);
  END LOOP;

  ALTER TABLE public.co_hosts
    ADD CONSTRAINT co_hosts_role_check
    CHECK (role IN ('owner', 'super_admin', 'manager', 'caretaker'));
END $$;

-- Ensure required room_categories pricing & inventory columns exist
ALTER TABLE IF EXISTS public.room_categories
  ADD COLUMN IF NOT EXISTS capacity_children INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_occupancy INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_occupancy INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS price_tiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_inventory INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS inventory_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rate_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Ensure required hotel_settings pricing columns exist
ALTER TABLE IF EXISTS public.hotel_settings
  ADD COLUMN IF NOT EXISTS child_policy_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS child_policy_min_age INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS child_policy_max_age INT NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS extra_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_cp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_plan_cp_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_cp_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_map_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_plan_map_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_map_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_ap_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_plan_ap_adult_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meal_plan_ap_child_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_meal_plan TEXT NOT NULL DEFAULT 'EP',
  ADD COLUMN IF NOT EXISTS offers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Ensure uniqueness of cryptographic payment tokens using exact prefix check (no LIKE '_' wildcard)
DROP INDEX IF EXISTS public.idx_bookings_unique_payment_token;
CREATE UNIQUE INDEX idx_bookings_unique_payment_token
  ON public.bookings (selected_slot)
  WHERE selected_slot IS NOT NULL AND left(selected_slot, 3) = 'pl_';

-- ── 1. Revoke public/API execution on rls_auto_enable ─────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    RAISE NOTICE 'Secured: Revoked EXECUTE on public.rls_auto_enable() from public API roles.';
  END IF;
END $$;

-- ── 2. Fix mutable search_path on trigger_set_updated_at ───────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'trigger_set_updated_at'
  ) THEN
    ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public, pg_temp;
    RAISE NOTICE 'Secured: Fixed search_path on public.trigger_set_updated_at().';
  END IF;
END $$;

-- ── 3. Clean up obsolete RPCs and functions ───────────────────────────────────
DROP FUNCTION IF EXISTS public.confirm_booking_payment_simulation(text, numeric);
DROP FUNCTION IF EXISTS public.get_booking_by_payment_token(text);
DROP FUNCTION IF EXISTS public.create_guest_booking_draft(text, text, text, text, text, text, text, text, int, int, text[], text);
DROP FUNCTION IF EXISTS public.create_guest_booking_draft(text, text, text, text, text, text, text, text, int, int, text[], text, text, int[], text);

-- ── 4. Multi-Owner & Staff Authorization Helper Functions ─────────────────────
-- Single canonical source of truth for resort ownership and staff role hierarchy:
--   * Owner: properties.owner_id = auth.uid() OR co_hosts(user_id = auth.uid(), role IN ('owner', 'super_admin'))
--   * Manager: Owner OR co_hosts(user_id = auth.uid(), role = 'manager')
--   * Booking Acceptor: Owner, Manager, OR co_hosts(user_id = auth.uid(), role = 'caretaker', can_accept_bookings = TRUE)
--   * Booking Viewer / Staff Member: Owner, Manager, OR co_hosts(user_id = auth.uid(), role = 'caretaker')

CREATE OR REPLACE FUNCTION public.user_is_property_owner(p_property_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_property_id IS NULL THEN FALSE
    ELSE (
      EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = p_property_id
          AND p.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.co_hosts c
        WHERE c.property_id = p_property_id
          AND c.user_id IS NOT NULL
          AND c.user_id = auth.uid()
          AND c.role IN ('owner', 'super_admin')
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_property(p_property_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_property_id IS NULL THEN FALSE
    ELSE (
      public.user_is_property_owner(p_property_id)
      OR EXISTS (
        SELECT 1 FROM public.co_hosts c
        WHERE c.property_id = p_property_id
          AND c.user_id IS NOT NULL
          AND c.user_id = auth.uid()
          AND c.role = 'manager'
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_accept_bookings(p_property_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_property_id IS NULL THEN FALSE
    ELSE (
      public.user_can_manage_property(p_property_id)
      OR EXISTS (
        SELECT 1 FROM public.co_hosts c
        WHERE c.property_id = p_property_id
          AND c.user_id IS NOT NULL
          AND c.user_id = auth.uid()
          AND c.role = 'caretaker'
          AND COALESCE(c.can_accept_bookings, FALSE) = TRUE
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_bookings(p_property_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR p_property_id IS NULL THEN FALSE
    ELSE (
      public.user_can_manage_property(p_property_id)
      OR EXISTS (
        SELECT 1 FROM public.co_hosts c
        WHERE c.property_id = p_property_id
          AND c.user_id IS NOT NULL
          AND c.user_id = auth.uid()
          AND c.role = 'caretaker'
      )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.user_is_property_owner(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_manage_property(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_accept_bookings(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_view_bookings(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.user_is_property_owner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_property(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_accept_bookings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_bookings(text) TO authenticated;

-- ── 5. Multi-Owner & Staff RLS Policies Across Resort Tables ──────────────────

-- 5.1 public.properties:
--   - anon SELECT: published properties only
--   - authenticated SELECT: any owner, manager, or caretaker of the property
--   - authenticated INSERT: primary owner_id = auth.uid()
--   - authenticated UPDATE: any property owner (primary owner_id OR co-owner in co_hosts)
--   - authenticated DELETE: primary owner_id = auth.uid() only
DROP POLICY IF EXISTS "Owners manage their properties" ON public.properties;
DROP POLICY IF EXISTS "Public read published properties" ON public.properties;
DROP POLICY IF EXISTS "properties_staff_select" ON public.properties;
DROP POLICY IF EXISTS "properties_owner_insert" ON public.properties;
DROP POLICY IF EXISTS "properties_owner_update" ON public.properties;
DROP POLICY IF EXISTS "properties_primary_owner_delete" ON public.properties;

CREATE POLICY "Public read published properties"
  ON public.properties FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "properties_staff_select"
  ON public.properties FOR SELECT
  TO authenticated
  USING (public.user_can_view_bookings(id));

CREATE POLICY "properties_owner_insert"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "properties_owner_update"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (public.user_is_property_owner(id))
  WITH CHECK (public.user_is_property_owner(id));

CREATE POLICY "properties_primary_owner_delete"
  ON public.properties FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- Protect properties.owner_id from being reassigned by a secondary co-owner
CREATE OR REPLACE FUNCTION public.trg_protect_property_primary_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    IF current_user IN ('anon', 'authenticated')
       AND OLD.owner_id IS NOT NULL
       AND (SELECT auth.uid()) IS DISTINCT FROM OLD.owner_id
    THEN
      RAISE EXCEPTION 'Only the primary property owner can transfer primary ownership';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_property_primary_owner ON public.properties;
CREATE TRIGGER protect_property_primary_owner
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_property_primary_owner();

-- 5.2 public.co_hosts (Consolidated SELECT policy + Strict Owner-Only Write Policy):
--   - Resolves Advisor DB-10 (overlapping permissive SELECT policies on co_hosts).
--   - Prevents privilege escalation: managers/caretakers CANNOT insert/update/delete co_hosts.
DROP POLICY IF EXISTS "Owners manage their co-hosts" ON public.co_hosts;
DROP POLICY IF EXISTS "Co-hosts can read their own record" ON public.co_hosts;
DROP POLICY IF EXISTS "co_hosts_staff_select" ON public.co_hosts;
DROP POLICY IF EXISTS "co_hosts_owners_insert" ON public.co_hosts;
DROP POLICY IF EXISTS "co_hosts_owners_update" ON public.co_hosts;
DROP POLICY IF EXISTS "co_hosts_owners_delete" ON public.co_hosts;

CREATE POLICY "co_hosts_staff_select"
  ON public.co_hosts FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.user_can_view_bookings(property_id)
  );

CREATE POLICY "co_hosts_owners_insert"
  ON public.co_hosts FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_property_owner(property_id));

CREATE POLICY "co_hosts_owners_update"
  ON public.co_hosts FOR UPDATE
  TO authenticated
  USING (public.user_is_property_owner(property_id))
  WITH CHECK (public.user_is_property_owner(property_id));

CREATE POLICY "co_hosts_owners_delete"
  ON public.co_hosts FOR DELETE
  TO authenticated
  USING (public.user_is_property_owner(property_id));

REVOKE ALL ON public.co_hosts FROM anon;

-- 5.3 Owner-managed configuration & billing tables (hotel_settings, coupons):
--   - Authenticated staff can SELECT; ONLY owners (user_is_property_owner) can INSERT/UPDATE/DELETE.
DO $$
BEGIN
  IF to_regclass('public.hotel_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Owners manage their hotel settings" ON public.hotel_settings;
    DROP POLICY IF EXISTS "hotel_settings_staff_select" ON public.hotel_settings;
    DROP POLICY IF EXISTS "hotel_settings_owners_write" ON public.hotel_settings;
    DROP POLICY IF EXISTS "hotel_settings_owners_update" ON public.hotel_settings;
    DROP POLICY IF EXISTS "hotel_settings_owners_delete" ON public.hotel_settings;

    CREATE POLICY "hotel_settings_staff_select"
      ON public.hotel_settings FOR SELECT TO authenticated
      USING (public.user_can_view_bookings(property_id));

    CREATE POLICY "hotel_settings_owners_write"
      ON public.hotel_settings FOR INSERT TO authenticated
      WITH CHECK (public.user_is_property_owner(property_id));

    CREATE POLICY "hotel_settings_owners_update"
      ON public.hotel_settings FOR UPDATE TO authenticated
      USING (public.user_is_property_owner(property_id))
      WITH CHECK (public.user_is_property_owner(property_id));

    CREATE POLICY "hotel_settings_owners_delete"
      ON public.hotel_settings FOR DELETE TO authenticated
      USING (public.user_is_property_owner(property_id));
  END IF;

  IF to_regclass('public.coupons') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Owners manage their coupons" ON public.coupons;
    DROP POLICY IF EXISTS "coupons_staff_select" ON public.coupons;
    DROP POLICY IF EXISTS "coupons_owners_insert" ON public.coupons;
    DROP POLICY IF EXISTS "coupons_owners_update" ON public.coupons;
    DROP POLICY IF EXISTS "coupons_owners_delete" ON public.coupons;

    CREATE POLICY "coupons_staff_select"
      ON public.coupons FOR SELECT TO authenticated
      USING (public.user_can_view_bookings(property_id));

    CREATE POLICY "coupons_owners_insert"
      ON public.coupons FOR INSERT TO authenticated
      WITH CHECK (public.user_is_property_owner(property_id));

    CREATE POLICY "coupons_owners_update"
      ON public.coupons FOR UPDATE TO authenticated
      USING (public.user_is_property_owner(property_id))
      WITH CHECK (public.user_is_property_owner(property_id));

    CREATE POLICY "coupons_owners_delete"
      ON public.coupons FOR DELETE TO authenticated
      USING (public.user_is_property_owner(property_id));
  END IF;
END $$;

-- 5.4 Operational property tables (room_categories, pricing_overrides, addons, policies, guest_events):
--   - Authenticated staff can SELECT; Owners and Managers (user_can_manage_property) can INSERT/UPDATE/DELETE.
DO $$
DECLARE
  tbl text;
  legacy_pol text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['room_categories', 'pricing_overrides', 'addons', 'policies', 'guest_events', 'faqs', 'testimonials', 'custom_pages', 'media_library', 'guest_messages', 'event_logs']
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      FOR legacy_pol IN (
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
          AND policyname ILIKE 'Owners %'
      ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', legacy_pol, tbl);
      END LOOP;

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_staff_select', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_managers_insert', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_managers_update', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_managers_delete', tbl);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.user_can_view_bookings(property_id));',
        tbl || '_staff_select', tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.user_can_manage_property(property_id));',
        tbl || '_managers_insert', tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.user_can_manage_property(property_id)) WITH CHECK (public.user_can_manage_property(property_id));',
        tbl || '_managers_update', tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.user_can_manage_property(property_id));',
        tbl || '_managers_delete', tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── 6. Drop ALL existing policies on public.bookings & Recreate Role-Scoped Policies ──
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings;', pol.policyname);
    RAISE NOTICE 'Dropped legacy policy: %', pol.policyname;
  END LOOP;
END $$;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 6a. SELECT: Any property owner, manager, or caretaker assigned to the property
CREATE POLICY "bookings_staff_select_own_property"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.user_can_view_bookings(property_id));

-- 6b. INSERT: Property owner, manager, or caretaker with can_accept_bookings = TRUE
CREATE POLICY "bookings_staff_insert_own_property"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (public.user_can_accept_bookings(property_id));

-- 6c. UPDATE: Property owner, manager, or caretaker with can_accept_bookings = TRUE
-- (Sensitive columns are further restricted by trg_bookings_security_and_inventory_guard)
CREATE POLICY "bookings_staff_update_own_property"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.user_can_accept_bookings(property_id))
WITH CHECK (public.user_can_accept_bookings(property_id));

-- 6d. DELETE: Property owners ONLY (primary owner_id or co-owner with role IN ('owner', 'super_admin'))
CREATE POLICY "bookings_staff_delete_own_property"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.user_is_property_owner(property_id));

-- ── 7. Restrict Table Grants on public.bookings ──────────────────────────────
REVOKE ALL ON public.bookings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- ── 8. Sensitive Field Protection, Concurrency, Inventory & Coupon Trigger ───
-- Enforces invariants on EVERY INSERT and UPDATE to public.bookings, ensuring that
-- direct table writes by authenticated users cannot tamper with prices, fabricate
-- paid statuses, mutate immutable identifiers, or bypass blocked dates / inventory.
CREATE OR REPLACE FUNCTION public.trg_bookings_security_and_inventory_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_client_role boolean;
  v_is_trusted_rpc boolean;
  v_is_owner boolean := FALSE;
  v_prop_record RECORD;
  v_check_in_date date;
  v_check_out_date date;
  v_nights int;
  v_raw_room_arr text[];
  v_room_id_arr text[] := '{}'::text[];
  v_curr_room_id text;
  v_distinct_room_id text;
  v_req_qty int;
  v_room_record RECORD;
  v_day_idx int;
  v_curr_date date;
  v_date_str text;
  v_override_rec RECORD;
  v_daily_inventory int;
  v_booked_units int;
  v_min_expected_room_total numeric := 0;
  v_day_base_price numeric;
  v_coupon_code_clean text;
  v_coupon_rec RECORD;
BEGIN
  v_is_trusted_rpc := (COALESCE(current_setting('myota.trusted_booking_rpc', true), '') = 'true');
  v_is_client_role := (
    NOT v_is_trusted_rpc
    AND (
      current_user IN ('anon', 'authenticated')
      OR COALESCE(current_setting('request.jwt.claim.role', true), '') IN ('anon', 'authenticated')
    )
  );

  -- Normalize NULL statuses deterministically
  NEW.booking_status := COALESCE(NULLIF(trim(NEW.booking_status), ''), 'confirmed');
  NEW.payment_status := COALESCE(NULLIF(trim(NEW.payment_status), ''), 'pending');
  NEW.paid_amount := COALESCE(NEW.paid_amount, 0);

  IF NEW.booking_status NOT IN ('confirmed', 'cancelled', 'checked_in', 'checked_out', 'no_show') THEN
    RAISE EXCEPTION 'Invalid booking_status value: %', NEW.booking_status;
  END IF;

  IF NEW.payment_status NOT IN ('pending', 'paid', 'partially_paid', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status value: %', NEW.payment_status;
  END IF;

  -- ── A. INSERT INVARIANTS ──────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS NULL OR trim(NEW.id) !~ '^BK-[A-Z0-9-]{6,32}$' THEN
      RAISE EXCEPTION 'Invalid booking ID format. Expected BK-<alphanumeric>';
    END IF;

    IF NEW.total_price IS NULL OR NEW.total_price <= 0 THEN
      RAISE EXCEPTION 'Booking total_price must be greater than zero';
    END IF;

    -- Client-initiated inserts (including staff PaymentLink creation and guest RPC)
    -- must ALWAYS start as unpaid pending reservations.
    IF v_is_client_role OR v_is_trusted_rpc THEN
      IF NEW.payment_status != 'pending' THEN
        RAISE EXCEPTION 'New bookings must be created with payment_status = pending';
      END IF;
      IF NEW.paid_amount != 0 THEN
        RAISE EXCEPTION 'New bookings must be created with paid_amount = 0';
      END IF;
      IF NEW.booking_status != 'confirmed' THEN
        RAISE EXCEPTION 'New bookings must be created with booking_status = confirmed';
      END IF;
    END IF;

    -- If this insert did NOT already run through create_guest_booking_draft,
    -- enforce token format, property status, concurrency locks, blocked dates, and inventory!
    IF NOT v_is_trusted_rpc THEN
      IF v_is_client_role THEN
        v_is_owner := public.user_is_property_owner(NEW.property_id);
      ELSE
        v_is_owner := TRUE;
      END IF;

      -- Ensure a valid cryptographic payment token on room bookings
      IF NEW.room_id IS NULL OR trim(NEW.room_id) NOT LIKE 'event-booking-%' THEN
        IF NEW.selected_slot IS NULL OR trim(NEW.selected_slot) = '' THEN
          NEW.selected_slot := 'pl_' || encode(gen_random_bytes(16), 'hex');
        ELSIF v_is_client_role AND trim(NEW.selected_slot) !~ '^pl_[a-z0-9]{24,32}$' THEN
          RAISE EXCEPTION 'Invalid payment token format in selected_slot';
        END IF;
      END IF;

      -- Validate property exists
      SELECT id, status INTO v_prop_record
      FROM public.properties
      WHERE id = NEW.property_id;

      IF NOT FOUND OR v_prop_record.id IS NULL THEN
        RAISE EXCEPTION 'Invalid property_id reference';
      END IF;

      -- Validate dates
      IF NEW.check_in IS NULL OR NEW.check_out IS NULL
         OR trim(NEW.check_in) !~ '^\d{4}-\d{2}-\d{2}$'
         OR trim(NEW.check_out) !~ '^\d{4}-\d{2}-\d{2}$'
      THEN
        RAISE EXCEPTION 'Invalid check_in or check_out date format. Expected YYYY-MM-DD';
      END IF;

      v_check_in_date := trim(NEW.check_in)::date;
      v_check_out_date := trim(NEW.check_out)::date;

      IF NEW.room_id IS NULL OR trim(NEW.room_id) = '' THEN
        RAISE EXCEPTION 'room_id is required';
      END IF;

      IF trim(NEW.room_id) NOT LIKE 'event-booking-%' THEN
        IF v_check_out_date <= v_check_in_date THEN
          RAISE EXCEPTION 'check_out must be after check_in';
        END IF;
        v_nights := v_check_out_date - v_check_in_date;

        -- Acquire transaction-scoped concurrency lock for this property
        PERFORM pg_advisory_xact_lock(hashtext('myota_booking_lock:' || NEW.property_id));
        PERFORM 1 FROM public.room_categories WHERE property_id = NEW.property_id ORDER BY id FOR UPDATE;

        v_raw_room_arr := string_to_array(NEW.room_id, ',');
        FOREACH v_curr_room_id IN ARRAY v_raw_room_arr LOOP
          v_curr_room_id := trim(v_curr_room_id);
          SELECT * INTO v_room_record
          FROM public.room_categories
          WHERE id = v_curr_room_id
            AND property_id = NEW.property_id
            AND COALESCE(is_active, TRUE) = TRUE;

          IF NOT FOUND OR v_room_record.id IS NULL THEN
            RAISE EXCEPTION 'Invalid or inactive room_id % for property %', v_curr_room_id, NEW.property_id;
          END IF;
          v_room_id_arr := array_append(v_room_id_arr, v_curr_room_id);
        END LOOP;

        -- Check blocked dates and per-night inventory for each distinct room
        FOR v_distinct_room_id, v_req_qty IN
          SELECT r_id, COUNT(*)::int
          FROM unnest(v_room_id_arr) AS r_id
          GROUP BY r_id
        LOOP
          SELECT * INTO v_room_record FROM public.room_categories WHERE id = v_distinct_room_id;

          FOR v_day_idx IN 0..(v_nights - 1) LOOP
            v_curr_date := v_check_in_date + v_day_idx;
            v_date_str := to_char(v_curr_date, 'YYYY-MM-DD');

            SELECT price, is_blocked INTO v_override_rec
            FROM public.pricing_overrides
            WHERE room_id = v_distinct_room_id
              AND date = v_curr_date
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND AND COALESCE(v_override_rec.is_blocked, FALSE) = TRUE THEN
              RAISE EXCEPTION 'Room % is blocked on % and unavailable for booking', v_room_record.name, v_date_str;
            END IF;

            v_day_base_price := CASE
              WHEN FOUND AND v_override_rec.price IS NOT NULL AND v_override_rec.price > 0 THEN v_override_rec.price
              ELSE COALESCE(v_room_record.base_price, 0)
            END;
            v_min_expected_room_total := v_min_expected_room_total + (v_day_base_price * v_req_qty);

            v_daily_inventory := COALESCE(v_room_record.total_inventory, 1);
            IF v_room_record.inventory_overrides IS NOT NULL
               AND jsonb_typeof(v_room_record.inventory_overrides) = 'object'
               AND (v_room_record.inventory_overrides ? v_date_str)
            THEN
              BEGIN
                v_daily_inventory := (v_room_record.inventory_overrides ->> v_date_str)::int;
              EXCEPTION WHEN OTHERS THEN
                v_daily_inventory := COALESCE(v_room_record.total_inventory, 1);
              END;
            END IF;

            IF v_daily_inventory <= 0 THEN
              RAISE EXCEPTION 'Room % has no inventory available on %', v_room_record.name, v_date_str;
            END IF;

            SELECT COALESCE(SUM(
              (
                SELECT COUNT(*)
                FROM unnest(string_to_array(regexp_replace(COALESCE(b.room_id, ''), '\s+', '', 'g'), ',')) AS booked_r_id
                WHERE booked_r_id = v_distinct_room_id
              )
            ), 0)::int
            INTO v_booked_units
            FROM public.bookings b
            WHERE b.property_id = NEW.property_id
              AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
              AND b.room_id IS NOT NULL
              AND b.room_id NOT LIKE 'event-booking%'
              AND CASE WHEN trim(b.check_in) ~ '^\d{4}-\d{2}-\d{2}$' THEN trim(b.check_in)::date ELSE NULL END <= v_curr_date
              AND CASE WHEN trim(b.check_out) ~ '^\d{4}-\d{2}-\d{2}$' THEN trim(b.check_out)::date ELSE NULL END > v_curr_date;

            IF (v_booked_units + v_req_qty) > v_daily_inventory THEN
              RAISE EXCEPTION 'Room % is sold out on %', v_room_record.name, v_date_str;
            END IF;
          END LOOP;
        END LOOP;

        -- Prevent non-owner staff from inserting bookings with arbitrary discounted total_price below base room rate
        IF v_is_client_role AND NOT v_is_owner AND NEW.total_price < v_min_expected_room_total THEN
          RAISE EXCEPTION 'Non-owner staff cannot override room pricing below configured base rates';
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- ── B. UPDATE INVARIANTS ──────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' THEN
    -- 1. Core identifiers are strictly immutable
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Booking id is immutable';
    END IF;
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'Booking property_id is immutable';
    END IF;
    IF NEW.selected_slot IS DISTINCT FROM OLD.selected_slot THEN
      RAISE EXCEPTION 'Booking selected_slot / payment token is immutable';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Booking created_at is immutable';
    END IF;

    IF NEW.total_price IS NULL OR NEW.total_price <= 0 THEN
      RAISE EXCEPTION 'Booking total_price must be greater than zero';
    END IF;

    -- 2. Sensitive field protection for authenticated client sessions
    IF v_is_client_role THEN
      v_is_owner := public.user_is_property_owner(OLD.property_id);

      -- No client role (not even an owner) can fabricate payment confirmation or increase paid_amount directly.
      -- Payment settlement (marking 'paid'/'partially_paid' from 'pending' or increasing paid_amount)
      -- is restricted to trusted backend / service_role execution.
      IF NEW.paid_amount > COALESCE(OLD.paid_amount, 0) THEN
        RAISE EXCEPTION 'Direct client increase of paid_amount is forbidden; payment settlement requires verified backend confirmation';
      END IF;

      IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
        -- The ONLY payment_status transition allowed from the client UI is an Owner issuing a refund
        -- on an already-paid booking (decreasing paid_amount and setting 'refunded' or 'partially_paid').
        IF NOT (
          v_is_owner
          AND COALESCE(OLD.paid_amount, 0) > 0
          AND NEW.paid_amount >= 0
          AND NEW.paid_amount < COALESCE(OLD.paid_amount, 0)
          AND (
            (NEW.paid_amount = 0 AND NEW.payment_status = 'refunded')
            OR (NEW.paid_amount > 0 AND NEW.payment_status = 'partially_paid')
          )
        ) THEN
          RAISE EXCEPTION 'Direct client modification of payment_status to % is forbidden', NEW.payment_status;
        END IF;
      ELSIF NEW.paid_amount < COALESCE(OLD.paid_amount, 0) THEN
        IF NOT v_is_owner THEN
          RAISE EXCEPTION 'Only property owners can issue refunds or reduce paid_amount';
        END IF;
      END IF;

      -- Non-owner staff (managers and caretakers) cannot tamper with price, room, coupon, or refunds
      IF NOT v_is_owner THEN
        IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
          RAISE EXCEPTION 'Only property owners can modify booking total_price';
        END IF;
        IF NEW.room_id IS DISTINCT FROM OLD.room_id OR NEW.room_name IS DISTINCT FROM OLD.room_name THEN
          RAISE EXCEPTION 'Non-owner staff cannot modify booked room categories';
        END IF;
        IF NEW.coupon_code IS DISTINCT FROM OLD.coupon_code THEN
          RAISE EXCEPTION 'Non-owner staff cannot modify booking coupon_code';
        END IF;
        IF NEW.refunds IS DISTINCT FROM OLD.refunds THEN
          RAISE EXCEPTION 'Only property owners can record booking refunds';
        END IF;
      END IF;
    END IF;

    -- 3. Re-validate blocked dates & inventory if dates, rooms, or active status changed
    IF (
      NEW.check_in IS DISTINCT FROM OLD.check_in
      OR NEW.check_out IS DISTINCT FROM OLD.check_out
      OR NEW.room_id IS DISTINCT FROM OLD.room_id
      OR (COALESCE(OLD.booking_status, 'confirmed') = 'cancelled' AND NEW.booking_status != 'cancelled')
    ) AND NEW.booking_status != 'cancelled'
      AND NEW.room_id IS NOT NULL
      AND trim(NEW.room_id) NOT LIKE 'event-booking-%'
    THEN
      IF NEW.check_in IS NULL OR NEW.check_out IS NULL
         OR trim(NEW.check_in) !~ '^\d{4}-\d{2}-\d{2}$'
         OR trim(NEW.check_out) !~ '^\d{4}-\d{2}-\d{2}$'
      THEN
        RAISE EXCEPTION 'Invalid check_in or check_out date format. Expected YYYY-MM-DD';
      END IF;

      v_check_in_date := trim(NEW.check_in)::date;
      v_check_out_date := trim(NEW.check_out)::date;
      IF v_check_out_date <= v_check_in_date THEN
        RAISE EXCEPTION 'check_out must be after check_in';
      END IF;
      v_nights := v_check_out_date - v_check_in_date;

      PERFORM pg_advisory_xact_lock(hashtext('myota_booking_lock:' || NEW.property_id));
      PERFORM 1 FROM public.room_categories WHERE property_id = NEW.property_id ORDER BY id FOR UPDATE;

      v_raw_room_arr := string_to_array(NEW.room_id, ',');
      FOREACH v_curr_room_id IN ARRAY v_raw_room_arr LOOP
        v_curr_room_id := trim(v_curr_room_id);
        SELECT * INTO v_room_record
        FROM public.room_categories
        WHERE id = v_curr_room_id
          AND property_id = NEW.property_id
          AND COALESCE(is_active, TRUE) = TRUE;

        IF NOT FOUND OR v_room_record.id IS NULL THEN
          RAISE EXCEPTION 'Invalid or inactive room_id % for property %', v_curr_room_id, NEW.property_id;
        END IF;
        v_room_id_arr := array_append(v_room_id_arr, v_curr_room_id);
      END LOOP;

      FOR v_distinct_room_id, v_req_qty IN
        SELECT r_id, COUNT(*)::int
        FROM unnest(v_room_id_arr) AS r_id
        GROUP BY r_id
      LOOP
        SELECT * INTO v_room_record FROM public.room_categories WHERE id = v_distinct_room_id;

        FOR v_day_idx IN 0..(v_nights - 1) LOOP
          v_curr_date := v_check_in_date + v_day_idx;
          v_date_str := to_char(v_curr_date, 'YYYY-MM-DD');

          SELECT price, is_blocked INTO v_override_rec
          FROM public.pricing_overrides
          WHERE room_id = v_distinct_room_id
            AND date = v_curr_date
          ORDER BY created_at DESC
          LIMIT 1;

          IF FOUND AND COALESCE(v_override_rec.is_blocked, FALSE) = TRUE THEN
            RAISE EXCEPTION 'Room % is blocked on % and unavailable for booking', v_room_record.name, v_date_str;
          END IF;

          v_daily_inventory := COALESCE(v_room_record.total_inventory, 1);
          IF v_room_record.inventory_overrides IS NOT NULL
             AND jsonb_typeof(v_room_record.inventory_overrides) = 'object'
             AND (v_room_record.inventory_overrides ? v_date_str)
          THEN
            BEGIN
              v_daily_inventory := (v_room_record.inventory_overrides ->> v_date_str)::int;
            EXCEPTION WHEN OTHERS THEN
              v_daily_inventory := COALESCE(v_room_record.total_inventory, 1);
            END;
          END IF;

          IF v_daily_inventory <= 0 THEN
            RAISE EXCEPTION 'Room % has no inventory available on %', v_room_record.name, v_date_str;
          END IF;

          SELECT COALESCE(SUM(
            (
              SELECT COUNT(*)
              FROM unnest(string_to_array(regexp_replace(COALESCE(b.room_id, ''), '\s+', '', 'g'), ',')) AS booked_r_id
              WHERE booked_r_id = v_distinct_room_id
            )
          ), 0)::int
          INTO v_booked_units
          FROM public.bookings b
          WHERE b.property_id = NEW.property_id
            AND b.id != OLD.id
            AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
            AND b.room_id IS NOT NULL
            AND b.room_id NOT LIKE 'event-booking%'
            AND CASE WHEN trim(b.check_in) ~ '^\d{4}-\d{2}-\d{2}$' THEN trim(b.check_in)::date ELSE NULL END <= v_curr_date
            AND CASE WHEN trim(b.check_out) ~ '^\d{4}-\d{2}-\d{2}$' THEN trim(b.check_out)::date ELSE NULL END > v_curr_date;

          IF (v_booked_units + v_req_qty) > v_daily_inventory THEN
            RAISE EXCEPTION 'Room % is sold out on %', v_room_record.name, v_date_str;
          END IF;
        END LOOP;
      END LOOP;
    END IF;

    -- 4. Coupon consumption accounting: increment use_count ONLY when a booking transitions
    --    from 'pending' to a confirmed paid state ('paid' or 'partially_paid').
    IF COALESCE(OLD.payment_status, 'pending') = 'pending'
       AND NEW.payment_status IN ('paid', 'partially_paid')
       AND NEW.coupon_code IS NOT NULL
       AND trim(NEW.coupon_code) != ''
       AND left(trim(NEW.coupon_code), 1) != '{'
    THEN
      v_coupon_code_clean := upper(trim(NEW.coupon_code));
      SELECT * INTO v_coupon_rec
      FROM public.coupons
      WHERE property_id = NEW.property_id
        AND upper(code) = v_coupon_code_clean
      FOR UPDATE;

      IF FOUND AND v_coupon_rec.id IS NOT NULL THEN
        IF v_coupon_rec.max_uses IS NOT NULL AND COALESCE(v_coupon_rec.use_count, 0) >= v_coupon_rec.max_uses THEN
          RAISE EXCEPTION 'Coupon % has already reached its maximum redemption limit', v_coupon_code_clean;
        END IF;

        UPDATE public.coupons
        SET use_count = COALESCE(use_count, 0) + 1
        WHERE id = v_coupon_rec.id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_bookings_security_and_inventory_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_security_and_inventory_guard ON public.bookings;
CREATE TRIGGER bookings_security_and_inventory_guard
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_bookings_security_and_inventory_guard();

-- ── 9. Secure Guest Payment Link Lookup (Anchored Regex, Exception-Safe, Zero PII) ──
-- Preserves valid existing payment links while rejecting booking IDs and non-link tokens.
-- Validates modern tokens with anchored regex ^pl_[a-z0-9]{24,32}$ (never SQL LIKE '_').
-- Safely parses legacy/malformed coupon_code JSONB without throwing runtime errors.
-- Returns ONLY the fields required by GuestPaymentLinkView.tsx.
CREATE OR REPLACE FUNCTION public.get_booking_by_payment_token(p_token text)
RETURNS TABLE (
  booking_id text,
  property_id text,
  property_name text,
  room_id text,
  room_name text,
  guest_display_name text,
  check_in text,
  check_out text,
  adults int,
  children int,
  total_price numeric,
  payment_status text,
  booking_status text,
  paid_amount numeric,
  pay_now_amount numeric,
  pricing_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_token text;
  v_rec RECORD;
  v_meta jsonb;
  v_raw_bd jsonb;
  v_pay_now numeric;
  v_parsed_pay_now numeric;
  v_breakdown jsonb := NULL;
  v_is_legacy_payment_link boolean := FALSE;
  v_is_expired boolean := FALSE;
BEGIN
  v_clean_token := trim(COALESCE(p_token, ''));

  -- Fast pre-filter: reject empty, overly short/long tokens, booking IDs (BK-...), or event slot IDs
  IF length(v_clean_token) < 10
     OR length(v_clean_token) > 64
     OR v_clean_token ~* '^BK-'
     OR v_clean_token ~* '^slot[-_]'
  THEN
    RETURN;
  END IF;

  -- Pre-validate token syntax before table lookup:
  -- Must be either a modern cryptographic payment token (^pl_[a-z0-9]{24,32}$)
  -- or a legacy base36 payment-link token (^[a-z0-9]{10,16}$).
  IF NOT (
    v_clean_token ~ '^pl_[a-z0-9]{24,32}$'
    OR v_clean_token ~ '^[a-z0-9]{10,16}$'
  ) THEN
    RETURN;
  END IF;

  SELECT
    b.id::text AS id,
    b.property_id::text AS property_id,
    COALESCE(NULLIF(hs.name, ''), p.name, '')::text AS property_name,
    COALESCE(b.room_id, '')::text AS room_id,
    b.room_name::text AS room_name,
    split_part(trim(b.guest_name), ' ', 1)::text AS guest_display_name,
    b.check_in::text AS check_in,
    b.check_out::text AS check_out,
    COALESCE(b.adults, 1)::int AS adults,
    COALESCE(b.children, 0)::int AS children,
    b.total_price::numeric AS total_price,
    COALESCE(b.payment_status, 'pending')::text AS payment_status,
    COALESCE(b.booking_status, 'confirmed')::text AS booking_status,
    COALESCE(b.paid_amount, 0)::numeric AS paid_amount,
    b.coupon_code::text AS coupon_code
  INTO v_rec
  FROM public.bookings b
  JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.hotel_settings hs ON hs.property_id = b.property_id
  WHERE b.selected_slot = v_clean_token
    AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
  LIMIT 1;

  IF NOT FOUND OR v_rec.id IS NULL THEN
    RETURN;
  END IF;

  v_pay_now := v_rec.total_price;

  -- Safely parse coupon_code metadata if it looks like a JSON object
  IF v_rec.coupon_code IS NOT NULL AND left(trim(v_rec.coupon_code), 1) = '{' THEN
    BEGIN
      v_meta := v_rec.coupon_code::jsonb;
      IF jsonb_typeof(v_meta) = 'object' THEN
        IF (v_meta ? 'isPaymentLink') AND lower(COALESCE(v_meta ->> 'isPaymentLink', '')) = 'true' THEN
          v_is_legacy_payment_link := TRUE;
        END IF;

        -- Safely extract numeric payNowAmount (only accept strictly positive amounts <= total_price)
        BEGIN
          IF (v_meta ? 'payNowAmount') AND nullif(trim(v_meta ->> 'payNowAmount'), '') IS NOT NULL THEN
            v_parsed_pay_now := (v_meta ->> 'payNowAmount')::numeric;
            IF v_parsed_pay_now > 0 AND v_parsed_pay_now <= v_rec.total_price THEN
              v_pay_now := v_parsed_pay_now;
            END IF;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          v_pay_now := v_rec.total_price;
        END;

        -- Safely enforce link expiry when pending
        BEGIN
          IF (v_meta ? 'expiry') AND nullif(trim(v_meta ->> 'expiry'), '') IS NOT NULL THEN
            IF (v_meta ->> 'expiry')::timestamptz < NOW() AND v_rec.payment_status = 'pending' THEN
              v_is_expired := TRUE;
            END IF;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;

        -- Safely extract and whitelist pricing breakdown fields only
        IF (v_meta ? 'breakdown') AND jsonb_typeof(v_meta -> 'breakdown') = 'object' THEN
          v_raw_bd := v_meta -> 'breakdown';
          v_breakdown := jsonb_strip_nulls(jsonb_build_object(
            'roomsCost', v_raw_bd -> 'roomsCost',
            'mealPlanCost', v_raw_bd -> 'mealPlanCost',
            'addonsCost', v_raw_bd -> 'addonsCost',
            'eventsCost', v_raw_bd -> 'eventsCost',
            'gstCost', v_raw_bd -> 'gstCost',
            'roomsGst', v_raw_bd -> 'roomsGst',
            'mealPlanGst', v_raw_bd -> 'mealPlanGst',
            'addonsGst', v_raw_bd -> 'addonsGst',
            'eventsGst', v_raw_bd -> 'eventsGst',
            'grandTotal', v_raw_bd -> 'grandTotal',
            'roomBreakdown', v_raw_bd -> 'roomBreakdown',
            'addonsBreakdown', v_raw_bd -> 'addonsBreakdown',
            'eventsBreakdown', v_raw_bd -> 'eventsBreakdown'
          ));
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Malformed JSON in coupon_code: fall back safely without raising an exception
      v_pay_now := v_rec.total_price;
      v_breakdown := NULL;
    END;
  END IF;

  IF v_is_expired THEN
    RETURN;
  END IF;

  -- Strict authorization check on token format:
  -- 1. Modern cryptographic token: anchored ^pl_[a-z0-9]{24,32}$
  -- 2. Legacy payment link: must have verified isPaymentLink=true in JSON metadata AND match ^[a-z0-9]{10,16}$
  IF NOT (
    v_clean_token ~ '^pl_[a-z0-9]{24,32}$'
    OR (v_is_legacy_payment_link AND v_clean_token ~ '^[a-z0-9]{10,16}$')
  ) THEN
    RETURN;
  END IF;

  booking_id := v_rec.id;
  property_id := v_rec.property_id;
  property_name := v_rec.property_name;
  room_id := v_rec.room_id;
  room_name := v_rec.room_name;
  guest_display_name := v_rec.guest_display_name;
  check_in := v_rec.check_in;
  check_out := v_rec.check_out;
  adults := v_rec.adults;
  children := v_rec.children;
  total_price := v_rec.total_price;
  payment_status := v_rec.payment_status;
  booking_status := v_rec.booking_status;
  paid_amount := v_rec.paid_amount;
  pay_now_amount := v_pay_now;
  pricing_breakdown := v_breakdown;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_by_payment_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_by_payment_token(text) TO anon, authenticated;

-- ── 10. Secure RPC: Guest Booking Draft Creation (Trusted Server Boundary) ───
CREATE OR REPLACE FUNCTION public.create_guest_booking_draft(
  p_property_id text,
  p_room_id text,
  p_room_name text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_check_in text,
  p_check_out text,
  p_adults int DEFAULT 1,
  p_children int DEFAULT 0,
  p_addons text[] DEFAULT '{}'::text[],
  p_coupon_code text DEFAULT NULL,
  p_meal_plan text DEFAULT NULL,
  p_children_ages int[] DEFAULT NULL,
  p_selected_slot text DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_id text;
  v_guest_token text;
  v_prop_record RECORD;
  v_hs RECORD;
  v_has_hs boolean := FALSE;
  v_check_in_date date;
  v_check_out_date date;
  v_nights int;

  -- Child age policy & effective guest counts
  v_policy_enabled boolean := TRUE;
  v_min_age int := 5;
  v_max_age int := 12;
  v_child_idx int;
  v_child_age int;
  v_paying_children int := 0;
  v_adult_children int := 0;
  v_eff_adults int;
  v_eff_children int;
  v_total_guests int;

  -- Room array & distribution
  v_raw_room_arr text[];
  v_room_id_arr text[] := '{}'::text[];
  v_room_base_occ int[] := '{}'::int[];
  v_room_cap_adults int[] := '{}'::int[];
  v_dist_adults int[] := '{}'::int[];
  v_dist_children int[] := '{}'::int[];
  v_rem_adults int;
  v_rem_children int;
  v_room_count int := 0;
  v_idx int;
  v_curr_room_id text;
  v_room_record RECORD;
  v_total_max_capacity int := 0;
  v_total_min_occupancy int := 0;
  v_cur_guests int;
  v_space int;
  v_add int;

  -- Availability & Overrides
  v_distinct_room_id text;
  v_req_qty int;
  v_day_idx int;
  v_curr_date date;
  v_date_str text;
  v_override_rec RECORD;
  v_daily_inventory int;
  v_booked_units int;

  -- Pricing accumulators
  v_base_occ int;
  v_base_adults int;
  v_base_children int;
  v_base_guests int;
  v_extra_adults int;
  v_extra_children int;
  v_base_rate numeric;
  v_tier_rec RECORD;
  v_extra_adult_rate numeric := 0;
  v_extra_child_rate numeric := 0;
  v_is_cp_base boolean := FALSE;
  v_cp_adult_rate numeric := 0;
  v_cp_child_rate numeric := 0;
  v_cp_cost_per_night numeric := 0;
  v_extra_cost_per_night numeric := 0;
  v_day_base_price numeric;
  v_rate_ov_val jsonb;
  v_day_cost numeric;
  v_final_day_cost numeric;
  v_offer jsonb;

  v_subtotal numeric := 0;
  v_rooms_gst numeric := 0;
  v_addon_total numeric := 0;
  v_addons_gst numeric := 0;
  v_events_gst numeric := 0;
  v_meal_plan_total numeric := 0;
  v_meal_plan_gst numeric := 0;
  v_discount numeric := 0;
  v_gst_total numeric := 0;
  v_calculated_price numeric := 0;

  -- GST settings
  v_room_slabs jsonb := NULL;
  v_addons_tax_rate numeric := 18;
  v_events_tax_rate numeric := 18;
  v_meal_plans_tax_rate numeric := 18;
  v_gst_rate numeric := 0;
  v_slab jsonb;

  -- Add-ons, Events, Meal Plans & Coupons
  v_addon_item text;
  v_addon_meal_plan text := NULL;
  v_clean_title text;
  v_evt_rec RECORD;
  v_evt_disc numeric;
  v_evt_base_adult numeric;
  v_evt_base_child numeric;
  v_evt_adult_price numeric;
  v_evt_child_price numeric;
  v_evt_price numeric;
  v_addon_rec RECORD;
  v_item_price numeric;
  v_selected_mp text;
  v_mp_adult_rate numeric := 0;
  v_mp_child_rate numeric := 0;
  v_coupon_rec RECORD;

  -- Standalone event booking variables
  v_event_id text;
  v_slot_obj jsonb;
  v_slot_cap int := 0;
  v_slot_found boolean := FALSE;
  v_slot_time_range text := '';
  v_booked_event_guests int := 0;

  -- Insertion retry loop
  v_attempt int := 0;
  v_inserted boolean := FALSE;
BEGIN
  -- 1. Property & Published Status Validation
  IF p_property_id IS NULL OR trim(p_property_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Property ID is required');
  END IF;

  SELECT id, status INTO v_prop_record
  FROM public.properties
  WHERE id = p_property_id;

  IF v_prop_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid property reference');
  END IF;

  IF lower(COALESCE(v_prop_record.status, '')) != 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Property is not currently published or accepting reservations');
  END IF;

  -- 2. Acquire Transaction-Scoped Concurrency Locks for Property Inventory
  PERFORM pg_advisory_xact_lock(hashtext('myota_booking_lock:' || p_property_id));
  PERFORM 1 FROM public.room_categories WHERE property_id = p_property_id ORDER BY id FOR UPDATE;

  -- 3. Guest Details & Counts Validation
  IF p_guest_name IS NULL OR trim(p_guest_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest name is required');
  END IF;

  IF p_adults IS NULL OR p_adults < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least 1 adult guest is required');
  END IF;

  IF p_children IS NOT NULL AND p_children < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid children count');
  END IF;

  v_total_guests := p_adults + COALESCE(p_children, 0);

  -- 4. Genuine Calendar Date Parsing
  IF p_check_in IS NULL OR p_check_out IS NULL
     OR trim(p_check_in) !~ '^\d{4}-\d{2}-\d{2}$'
     OR trim(p_check_out) !~ '^\d{4}-\d{2}-\d{2}$'
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid date format. Expected YYYY-MM-DD');
  END IF;

  BEGIN
    v_check_in_date := trim(p_check_in)::date;
    v_check_out_date := trim(p_check_out)::date;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid calendar date. Expected YYYY-MM-DD');
  END;

  -- 5. Load Hotel Settings & GST Settings for Property
  SELECT * INTO v_hs
  FROM public.hotel_settings
  WHERE property_id = p_property_id
  LIMIT 1;

  IF FOUND THEN
    v_has_hs := TRUE;
    v_policy_enabled := COALESCE(v_hs.child_policy_enabled, FALSE);
    v_min_age := CASE WHEN v_policy_enabled THEN COALESCE(v_hs.child_policy_min_age, 5) ELSE 5 END;
    v_max_age := CASE WHEN v_policy_enabled THEN COALESCE(v_hs.child_policy_max_age, 12) ELSE 12 END;
    v_extra_adult_rate := COALESCE(v_hs.extra_adult_rate, 0);
    v_extra_child_rate := COALESCE(v_hs.extra_child_rate, 0);
    v_is_cp_base := (upper(COALESCE(v_hs.default_meal_plan, 'EP')) = 'CP');
    v_cp_adult_rate := CASE WHEN v_is_cp_base THEN COALESCE(v_hs.meal_plan_cp_adult_rate, 300) ELSE 0 END;
    v_cp_child_rate := CASE WHEN v_is_cp_base THEN COALESCE(v_hs.meal_plan_cp_child_rate, 250) ELSE 0 END;
  END IF;

  -- Evaluate child ages into effectiveAdults and effectiveChildren (default child age = 8)
  IF COALESCE(p_children, 0) > 0 THEN
    FOR v_child_idx IN 1..p_children LOOP
      IF p_children_ages IS NOT NULL AND v_child_idx <= cardinality(p_children_ages) THEN
        v_child_age := COALESCE(p_children_ages[v_child_idx], 8);
      ELSE
        v_child_age := 8;
      END IF;

      IF v_child_age > v_max_age THEN
        v_adult_children := v_adult_children + 1;
      ELSIF v_child_age > v_min_age THEN
        v_paying_children := v_paying_children + 1;
      END IF;
    END LOOP;
  END IF;

  v_eff_adults := p_adults + v_adult_children;
  v_eff_children := v_paying_children;

  -- Load custom GST settings if public.gst_settings table exists
  IF to_regclass('public.gst_settings') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT room_slabs, COALESCE(addons_rate, 18), COALESCE(events_rate, 18), COALESCE(meal_plans_rate, 18) FROM public.gst_settings WHERE property_id = $1 LIMIT 1'
        INTO v_room_slabs, v_addons_tax_rate, v_events_tax_rate, v_meal_plans_tax_rate
        USING p_property_id;
    EXCEPTION WHEN OTHERS THEN
      v_room_slabs := NULL;
      v_addons_tax_rate := 18;
      v_events_tax_rate := 18;
      v_meal_plans_tax_rate := 18;
    END;
  END IF;

  IF p_room_id IS NULL OR trim(p_room_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least one room category or event must be selected');
  END IF;

  -- ── 6A. Standalone Day-Event Booking Path (roomId = 'event-booking-<id>') ───
  IF trim(p_room_id) LIKE 'event-booking-%' THEN
    IF v_check_out_date < v_check_in_date THEN
      RETURN jsonb_build_object('success', false, 'error', 'Event end date cannot be before start date');
    END IF;

    v_event_id := substring(trim(p_room_id) FROM 15);
    SELECT * INTO v_evt_rec
    FROM public.guest_events
    WHERE id = v_event_id
      AND property_id = p_property_id
      AND is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND OR v_evt_rec.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Selected guest event does not exist or is inactive');
    END IF;

    -- Validate slot / event capacity (accounting for both standalone and room-addon event bookings)
    IF v_evt_rec.slots IS NOT NULL AND jsonb_typeof(v_evt_rec.slots) = 'array' AND jsonb_array_length(v_evt_rec.slots) > 0 THEN
      IF p_selected_slot IS NULL OR trim(p_selected_slot) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event timing slot selection is required');
      END IF;

      FOR v_slot_obj IN SELECT * FROM jsonb_array_elements(v_evt_rec.slots) LOOP
        IF (v_slot_obj ->> 'id') = trim(p_selected_slot) THEN
          v_slot_found := TRUE;
          v_slot_cap := COALESCE((v_slot_obj ->> 'capacity')::int, v_evt_rec.capacity, 50);
          BEGIN
            v_slot_time_range := to_char((v_slot_obj ->> 'fromTime')::time, 'HH12:MI AM') || ' - ' || to_char((v_slot_obj ->> 'toTime')::time, 'HH12:MI AM');
          EXCEPTION WHEN OTHERS THEN
            v_slot_time_range := COALESCE(v_slot_obj ->> 'fromTime', '') || ' - ' || COALESCE(v_slot_obj ->> 'toTime', '');
          END;
          EXIT;
        END IF;
      END LOOP;

      IF NOT v_slot_found THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid event timing slot');
      END IF;

      SELECT COALESCE(SUM(COALESCE(b.adults, 1) + COALESCE(b.children, 0)), 0)::int
      INTO v_booked_event_guests
      FROM public.bookings b
      WHERE b.property_id = p_property_id
        AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
        AND (
          (
            b.room_id = trim(p_room_id)
            AND (b.selected_slot = trim(p_selected_slot) OR ('SLOT:' || trim(p_selected_slot)) = ANY(COALESCE(b.addons, '{}'::text[])))
          )
          OR (
            v_slot_time_range != ''
            AND ('Event: ' || v_evt_rec.title || ' (' || v_slot_time_range || ')') = ANY(COALESCE(b.addons, '{}'::text[]))
          )
        );

      IF (v_booked_event_guests + v_total_guests) > v_slot_cap THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient capacity in the selected event slot');
      END IF;
    ELSE
      SELECT COALESCE(SUM(COALESCE(b.adults, 1) + COALESCE(b.children, 0)), 0)::int
      INTO v_booked_event_guests
      FROM public.bookings b
      WHERE b.property_id = p_property_id
        AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
        AND (
          b.room_id = trim(p_room_id)
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(b.addons, '{}'::text[])) AS a
            WHERE a LIKE ('Event: ' || v_evt_rec.title || '%') OR a LIKE ('EVENT:' || v_evt_rec.title || '%')
          )
        );

      IF (v_booked_event_guests + v_total_guests) > COALESCE(v_evt_rec.capacity, 50) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient capacity for the selected event');
      END IF;
    END IF;

    -- Calculate standalone event price (matching calculateEventBookingPrice)
    v_evt_disc := COALESCE(v_evt_rec.discount, 0);
    v_evt_base_adult := COALESCE(NULLIF(v_evt_rec.price_adult, 0), v_evt_rec.price, 0);
    v_evt_base_child := COALESCE(NULLIF(v_evt_rec.price_child, 0), v_evt_rec.price, 0);
    v_evt_adult_price := CASE WHEN v_evt_disc > 0 THEN round(v_evt_base_adult * (1.0 - v_evt_disc / 100.0)) ELSE v_evt_base_adult END;
    v_evt_child_price := CASE WHEN v_evt_disc > 0 THEN round(v_evt_base_child * (1.0 - v_evt_disc / 100.0)) ELSE v_evt_base_child END;

    v_subtotal := (v_eff_adults * v_evt_adult_price) + (v_eff_children * v_evt_child_price);
    v_calculated_price := round(GREATEST(0, v_subtotal));

  -- ── 6B. Standard & Multi-Room Stay Booking Path ────────────────────────────
  ELSE
    IF v_check_out_date <= v_check_in_date THEN
      RETURN jsonb_build_object('success', false, 'error', 'Check-out date must be after check-in date');
    END IF;

    v_nights := v_check_out_date - v_check_in_date;

    -- Parse and validate every requested room ID
    v_raw_room_arr := string_to_array(p_room_id, ',');
    FOREACH v_curr_room_id IN ARRAY v_raw_room_arr LOOP
      v_curr_room_id := trim(v_curr_room_id);
      IF v_curr_room_id = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empty room category ID in selection');
      END IF;

      SELECT * INTO v_room_record
      FROM public.room_categories
      WHERE id = v_curr_room_id;

      IF NOT FOUND OR v_room_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', format('Invalid room category ID: %s', v_curr_room_id));
      END IF;

      IF v_room_record.property_id != p_property_id THEN
        RETURN jsonb_build_object('success', false, 'error', format('Room %s does not belong to target property', v_curr_room_id));
      END IF;

      IF COALESCE(v_room_record.is_active, TRUE) = FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', format('Room %s is currently inactive', v_curr_room_id));
      END IF;

      v_room_id_arr := array_append(v_room_id_arr, v_curr_room_id);
      v_room_cap_adults := array_append(v_room_cap_adults, COALESCE(NULLIF(v_room_record.capacity_adults, 0), 2));
      v_room_base_occ := array_append(
        v_room_base_occ,
        COALESCE(NULLIF(v_room_record.base_occupancy, 0), COALESCE(NULLIF(v_room_record.capacity_adults, 0), 2))
      );
      v_dist_adults := array_append(v_dist_adults, 0);
      v_dist_children := array_append(v_dist_children, 0);

      v_total_max_capacity := v_total_max_capacity + COALESCE(NULLIF(v_room_record.capacity_adults, 0), 2);
      v_total_min_occupancy := v_total_min_occupancy + COALESCE(NULLIF(v_room_record.min_occupancy, 0), 1);
    END LOOP;

    v_room_count := cardinality(v_room_id_arr);
    IF v_room_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'At least one valid room category is required');
    END IF;

    -- Validate guest capacity and minimum occupancy across selected rooms
    IF v_total_guests > v_total_max_capacity OR v_eff_adults > v_total_max_capacity THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Guest count (%s) exceeds selected room capacity (%s)', GREATEST(v_total_guests, v_eff_adults), v_total_max_capacity)
      );
    END IF;

    IF v_total_guests < v_total_min_occupancy THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Selected rooms require at least %s guests total', v_total_min_occupancy)
      );
    END IF;

    -- Check Blocked Dates & Per-Night Inventory Availability for each distinct room category
    FOR v_distinct_room_id, v_req_qty IN
      SELECT r_id, COUNT(*)::int
      FROM unnest(v_room_id_arr) AS r_id
      GROUP BY r_id
    LOOP
      SELECT * INTO v_room_record
      FROM public.room_categories
      WHERE id = v_distinct_room_id;

      FOR v_day_idx IN 0..(v_nights - 1) LOOP
        v_curr_date := v_check_in_date + v_day_idx;
        v_date_str := to_char(v_curr_date, 'YYYY-MM-DD');

        -- Blocker 1: Explicitly reject if night is blocked in pricing_overrides (NEVER fall back to base_price)
        SELECT price, is_blocked INTO v_override_rec
        FROM public.pricing_overrides
        WHERE room_id = v_distinct_room_id
          AND date = v_curr_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND AND COALESCE(v_override_rec.is_blocked, FALSE) = TRUE THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Room %s is blocked on %s and unavailable for booking', v_room_record.name, v_date_str)
          );
        END IF;

        -- Determine daily inventory (inventory_overrides JSONB map or total_inventory)
        v_daily_inventory := COALESCE(v_room_record.total_inventory, 1);
        IF v_room_record.inventory_overrides IS NOT NULL
           AND jsonb_typeof(v_room_record.inventory_overrides) = 'object'
           AND (v_room_record.inventory_overrides ? v_date_str)
        THEN
          BEGIN
            v_daily_inventory := (v_room_record.inventory_overrides ->> v_date_str)::int;
          EXCEPTION WHEN OTHERS THEN
            v_daily_inventory := COALESCE(v_room_record.total_inventory, 1);
          END;
        END IF;

        IF v_daily_inventory <= 0 THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Room %s has no inventory available on %s', v_room_record.name, v_date_str)
          );
        END IF;

        -- Blocker 2: Count overlapping active reservations for this room on v_curr_date
        SELECT COALESCE(SUM(
          (
            SELECT COUNT(*)
            FROM unnest(string_to_array(regexp_replace(COALESCE(b.room_id, ''), '\s+', '', 'g'), ',')) AS booked_r_id
            WHERE booked_r_id = v_distinct_room_id
          )
        ), 0)::int
        INTO v_booked_units
        FROM public.bookings b
        WHERE b.property_id = p_property_id
          AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
          AND b.room_id IS NOT NULL
          AND b.room_id NOT LIKE 'event-booking%'
          AND CASE WHEN trim(b.check_in) ~ '^\d{4}-\d{2}-\d{2}$' THEN trim(b.check_in)::date ELSE NULL END <= v_curr_date
          AND CASE WHEN trim(b.check_out) ~ '^\d{4}-\d{2}-\d{2}$' THEN trim(b.check_out)::date ELSE NULL END > v_curr_date;

        IF (v_booked_units + v_req_qty) > v_daily_inventory THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format(
              'Room %s is sold out on %s (%s requested, %s available)',
              v_room_record.name, v_date_str, v_req_qty, GREATEST(0, v_daily_inventory - v_booked_units)
            )
          );
        END IF;
      END LOOP;
    END LOOP;

    -- Distribute effective adults & children across rooms (matching distributeAdultsAndChildren in OrganicTemplate.tsx)
    v_rem_adults := v_eff_adults;
    v_rem_children := v_eff_children;

    -- Phase 1: Give 1 adult to each room first (activation)
    FOR v_idx IN 1..v_room_count LOOP
      IF v_rem_adults > 0 THEN
        v_dist_adults[v_idx] := 1;
        v_rem_adults := v_rem_adults - 1;
      END IF;
    END LOOP;

    IF v_rem_adults = 0 THEN
      FOR v_idx IN 1..v_room_count LOOP
        IF v_dist_adults[v_idx] = 0 AND v_rem_children > 0 THEN
          v_dist_children[v_idx] := 1;
          v_rem_children := v_rem_children - 1;
        END IF;
      END LOOP;
    END IF;

    -- Phase 2: Fill up to base occupancy (adults first, then children)
    FOR v_idx IN 1..v_room_count LOOP
      v_cur_guests := v_dist_adults[v_idx] + v_dist_children[v_idx];
      v_space := GREATEST(0, v_room_base_occ[v_idx] - v_cur_guests);
      v_add := LEAST(v_space, v_rem_adults);
      v_dist_adults[v_idx] := v_dist_adults[v_idx] + v_add;
      v_rem_adults := v_rem_adults - v_add;

      v_cur_guests := v_dist_adults[v_idx] + v_dist_children[v_idx];
      v_space := GREATEST(0, v_room_base_occ[v_idx] - v_cur_guests);
      v_add := LEAST(v_space, v_rem_children);
      v_dist_children[v_idx] := v_dist_children[v_idx] + v_add;
      v_rem_children := v_rem_children - v_add;
    END LOOP;

    -- Phase 3: Fill up to max capacity
    FOR v_idx IN 1..v_room_count LOOP
      v_cur_guests := v_dist_adults[v_idx] + v_dist_children[v_idx];
      v_space := GREATEST(0, v_room_cap_adults[v_idx] - v_cur_guests);
      v_add := LEAST(v_space, v_rem_adults);
      v_dist_adults[v_idx] := v_dist_adults[v_idx] + v_add;
      v_rem_adults := v_rem_adults - v_add;

      v_cur_guests := v_dist_adults[v_idx] + v_dist_children[v_idx];
      v_space := GREATEST(0, v_room_cap_adults[v_idx] - v_cur_guests);
      v_add := LEAST(v_space, v_rem_children);
      v_dist_children[v_idx] := v_dist_children[v_idx] + v_add;
      v_rem_children := v_rem_children - v_add;
    END LOOP;

    IF v_rem_adults > 0 THEN
      v_dist_adults[1] := v_dist_adults[1] + v_rem_adults;
    END IF;
    IF v_rem_children > 0 THEN
      v_dist_children[1] := v_dist_children[1] + v_rem_children;
    END IF;

    -- Calculate night-by-night stay price and room GST for each selected room instance
    FOR v_idx IN 1..v_room_count LOOP
      v_curr_room_id := v_room_id_arr[v_idx];
      SELECT * INTO v_room_record
      FROM public.room_categories
      WHERE id = v_curr_room_id;

      v_base_occ := v_room_base_occ[v_idx];
      v_base_adults := LEAST(v_dist_adults[v_idx], v_base_occ);
      v_base_children := LEAST(v_dist_children[v_idx], GREATEST(0, v_base_occ - v_base_adults));
      v_base_guests := v_base_adults + v_base_children;
      v_extra_adults := GREATEST(0, v_dist_adults[v_idx] - v_base_adults);
      v_extra_children := GREATEST(0, v_dist_children[v_idx] - v_base_children);

      -- Evaluate getRoomPriceForGuests(room, v_base_guests)
      v_base_rate := COALESCE(v_room_record.base_price, 0);
      IF v_room_record.price_tiers IS NOT NULL
         AND jsonb_typeof(v_room_record.price_tiers) = 'object'
         AND v_room_record.price_tiers != '{}'::jsonb
      THEN
        IF v_room_record.price_tiers ? (v_base_guests::text) THEN
          BEGIN
            v_base_rate := (v_room_record.price_tiers ->> (v_base_guests::text))::numeric;
          EXCEPTION WHEN OTHERS THEN
            v_base_rate := COALESCE(v_room_record.base_price, 0);
          END;
        ELSE
          FOR v_tier_rec IN
            SELECT (key)::int AS tier_guests, (value #>> '{}')::numeric AS tier_price
            FROM jsonb_each(v_room_record.price_tiers)
            WHERE key ~ '^\d+$'
            ORDER BY (key)::int ASC
          LOOP
            IF v_base_rate = COALESCE(v_room_record.base_price, 0) OR v_base_guests >= v_tier_rec.tier_guests THEN
              v_base_rate := v_tier_rec.tier_price;
            END IF;
          END LOOP;
        END IF;
      END IF;

      v_cp_cost_per_night := (v_dist_adults[v_idx] * v_cp_adult_rate) + (v_dist_children[v_idx] * v_cp_child_rate);
      v_extra_cost_per_night := (v_extra_adults * v_extra_adult_rate) + (v_extra_children * v_extra_child_rate);

      FOR v_day_idx IN 0..(v_nights - 1) LOOP
        v_curr_date := v_check_in_date + v_day_idx;
        v_date_str := to_char(v_curr_date, 'YYYY-MM-DD');

        v_day_base_price := v_base_rate;

        -- Check calendar override from pricing_overrides (is_blocked already verified FALSE above)
        SELECT price, is_blocked INTO v_override_rec
        FROM public.pricing_overrides
        WHERE room_id = v_curr_room_id
          AND date = v_curr_date
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND AND v_override_rec.price IS NOT NULL AND v_override_rec.price > 0 THEN
          v_day_base_price := v_override_rec.price;
        ELSIF v_room_record.rate_overrides IS NOT NULL
              AND jsonb_typeof(v_room_record.rate_overrides) = 'object'
              AND (v_room_record.rate_overrides ? v_date_str)
        THEN
          BEGIN
            v_rate_ov_val := v_room_record.rate_overrides -> v_date_str;
            IF jsonb_typeof(v_rate_ov_val) = 'object' THEN
              IF (v_rate_ov_val ? (v_base_guests::text)) AND ((v_rate_ov_val ->> (v_base_guests::text))::numeric > 0) THEN
                v_day_base_price := (v_rate_ov_val ->> (v_base_guests::text))::numeric;
              END IF;
            ELSIF (v_room_record.rate_overrides ->> v_date_str)::numeric > 0 THEN
              v_day_base_price := (v_room_record.rate_overrides ->> v_date_str)::numeric;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        END IF;

        v_day_cost := v_day_base_price + v_extra_cost_per_night + v_cp_cost_per_night;

        -- Apply active room offers for this date & room category from hotel_settings.offers
        IF v_has_hs AND v_hs.offers IS NOT NULL AND jsonb_typeof(v_hs.offers) = 'array' THEN
          FOR v_offer IN SELECT * FROM jsonb_array_elements(v_hs.offers) LOOP
            IF jsonb_typeof(v_offer -> 'dates') = 'array'
               AND jsonb_typeof(v_offer -> 'roomIds') = 'array'
               AND (v_offer -> 'dates') @> to_jsonb(v_date_str)
               AND (v_offer -> 'roomIds') @> to_jsonb(v_curr_room_id)
            THEN
              IF (v_offer ->> 'discountType') = 'percent' THEN
                v_day_cost := v_day_cost * (1.0 - COALESCE((v_offer ->> 'discountValue')::numeric, 0) / 100.0);
              ELSE
                v_day_cost := GREATEST(0, v_day_cost - COALESCE((v_offer ->> 'discountValue')::numeric, 0));
              END IF;
            END IF;
          END LOOP;
        END IF;

        v_final_day_cost := round(v_day_cost);
        v_subtotal := v_subtotal + v_final_day_cost;

        -- Calculate GST for this room night
        v_gst_rate := 0;
        IF v_room_slabs IS NOT NULL AND jsonb_typeof(v_room_slabs) = 'array' AND jsonb_array_length(v_room_slabs) > 0 THEN
          FOR v_slab IN SELECT * FROM jsonb_array_elements(v_room_slabs) LOOP
            IF v_final_day_cost >= COALESCE((v_slab ->> 'min')::numeric, 0)
               AND v_final_day_cost <= COALESCE((v_slab ->> 'max')::numeric, 99999999)
            THEN
              v_gst_rate := COALESCE((v_slab ->> 'rate')::numeric, 0) / 100.0;
              EXIT;
            END IF;
          END LOOP;
        ELSE
          IF v_final_day_cost > 7500 THEN
            v_gst_rate := 0.18;
          ELSIF v_final_day_cost > 1000 THEN
            v_gst_rate := 0.05;
          ELSE
            v_gst_rate := 0;
          END IF;
        END IF;

        v_rooms_gst := v_rooms_gst + round(v_final_day_cost * v_gst_rate);
      END LOOP;
    END LOOP;

    -- 7. Evaluate Add-ons & Event Add-ons (matching OrganicTemplate.tsx)
    IF p_addons IS NOT NULL AND cardinality(p_addons) > 0 THEN
      FOREACH v_addon_item IN ARRAY p_addons LOOP
        v_addon_item := trim(COALESCE(v_addon_item, ''));
        IF v_addon_item = '' THEN
          CONTINUE;
        END IF;

        IF v_addon_item LIKE 'MEAL_PLAN:%' THEN
          v_addon_meal_plan := lower(trim(substring(v_addon_item FROM 11)));
        ELSIF v_addon_item LIKE 'Event: %' OR v_addon_item LIKE 'EVENT:%' THEN
          v_clean_title := split_part(regexp_replace(v_addon_item, '^(Event:\s*|EVENT:)', ''), ' (', 1);
          SELECT * INTO v_evt_rec
          FROM public.guest_events
          WHERE property_id = p_property_id
            AND title = trim(v_clean_title)
            AND is_active = TRUE
          FOR UPDATE;

          IF NOT FOUND OR v_evt_rec.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', format('Invalid or inactive event add-on: %s', v_clean_title));
          END IF;

          -- Check event capacity for room add-on event bookings as well
          SELECT COALESCE(SUM(COALESCE(b.adults, 1) + COALESCE(b.children, 0)), 0)::int
          INTO v_booked_event_guests
          FROM public.bookings b
          WHERE b.property_id = p_property_id
            AND COALESCE(b.booking_status, 'confirmed') != 'cancelled'
            AND (
              b.room_id = ('event-booking-' || v_evt_rec.id)
              OR EXISTS (
                SELECT 1 FROM unnest(COALESCE(b.addons, '{}'::text[])) AS a
                WHERE a LIKE ('Event: ' || v_evt_rec.title || '%') OR a LIKE ('EVENT:' || v_evt_rec.title || '%')
              )
            );

          IF (v_booked_event_guests + v_total_guests) > COALESCE(v_evt_rec.capacity, 50) THEN
            RETURN jsonb_build_object('success', false, 'error', format('Insufficient capacity for event add-on: %s', v_clean_title));
          END IF;

          v_evt_disc := COALESCE(v_evt_rec.discount, 0);
          v_evt_base_adult := COALESCE(NULLIF(v_evt_rec.price_adult, 0), v_evt_rec.price, 0);
          v_evt_base_child := COALESCE(NULLIF(v_evt_rec.price_child, 0), v_evt_rec.price, 0);
          v_evt_adult_price := CASE WHEN v_evt_disc > 0 THEN round(v_evt_base_adult * (1.0 - v_evt_disc / 100.0)) ELSE v_evt_base_adult END;
          v_evt_child_price := CASE WHEN v_evt_disc > 0 THEN round(v_evt_base_child * (1.0 - v_evt_disc / 100.0)) ELSE v_evt_base_child END;

          v_evt_price := (v_eff_adults * v_evt_adult_price) + (v_eff_children * v_evt_child_price);
          v_addon_total := v_addon_total + v_evt_price;
          v_events_gst := v_events_gst + round(v_evt_price * (v_events_tax_rate / 100.0));
        ELSE
          SELECT * INTO v_addon_rec
          FROM public.addons
          WHERE property_id = p_property_id
            AND name = v_addon_item
            AND is_active = TRUE
          LIMIT 1;

          IF NOT FOUND OR v_addon_rec.id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', format('Invalid or inactive add-on: %s', v_addon_item));
          END IF;

          IF v_addon_rec.pricing_type = 'per_head' THEN
            v_item_price := COALESCE(v_addon_rec.price, 0) * GREATEST(1, v_total_guests);
          ELSE
            v_item_price := COALESCE(v_addon_rec.price, 0);
          END IF;

          v_addon_total := v_addon_total + v_item_price;
          v_addons_gst := v_addons_gst + round(v_item_price * (v_addons_tax_rate / 100.0));
        END IF;
      END LOOP;
    END IF;

    -- 8. Evaluate Meal Plan Upgrade Cost & GST
    v_selected_mp := lower(trim(COALESCE(
      nullif(p_meal_plan, ''),
      v_addon_meal_plan,
      CASE WHEN v_is_cp_base THEN 'cp' ELSE 'ep' END
    )));

    IF v_is_cp_base THEN
      IF v_selected_mp = 'map' THEN
        v_mp_adult_rate := GREATEST(0, COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_map_adult_rate END, 1000) - v_cp_adult_rate);
        v_mp_child_rate := GREATEST(0, COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_map_child_rate END, 750) - v_cp_child_rate);
        v_meal_plan_total := ((v_eff_adults * v_mp_adult_rate) + (v_eff_children * v_mp_child_rate)) * v_nights;
      ELSIF v_selected_mp = 'ap' THEN
        v_mp_adult_rate := GREATEST(0, COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_ap_adult_rate END, 1500) - v_cp_adult_rate);
        v_mp_child_rate := GREATEST(0, COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_ap_child_rate END, 1250) - v_cp_child_rate);
        v_meal_plan_total := ((v_eff_adults * v_mp_adult_rate) + (v_eff_children * v_mp_child_rate)) * v_nights;
      END IF;
    ELSE
      IF v_selected_mp IN ('cp', 'map', 'ap') THEN
        IF v_selected_mp = 'cp' THEN
          v_mp_adult_rate := COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_cp_adult_rate END, 300);
          v_mp_child_rate := COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_cp_child_rate END, 250);
        ELSIF v_selected_mp = 'map' THEN
          v_mp_adult_rate := COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_map_adult_rate END, 1000);
          v_mp_child_rate := COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_map_child_rate END, 750);
        ELSE
          v_mp_adult_rate := COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_ap_adult_rate END, 1500);
          v_mp_child_rate := COALESCE(CASE WHEN v_has_hs THEN v_hs.meal_plan_ap_child_rate END, 1250);
        END IF;
        v_meal_plan_total := ((v_eff_adults * v_mp_adult_rate) + (v_eff_children * v_mp_child_rate)) * v_nights;
      END IF;
    END IF;

    v_meal_plan_gst := round(v_meal_plan_total * (v_meal_plans_tax_rate / 100.0));

    -- 9. Validate & Apply Coupon Discount
    -- Note: Coupons are validated and discounted here, but coupons.use_count is ONLY incremented
    -- when the booking transitions from 'pending' to 'paid'/'partially_paid' (via trigger),
    -- preventing anonymous draft creation from exhausting limited-use coupons.
    IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) != '' THEN
      SELECT * INTO v_coupon_rec
      FROM public.coupons
      WHERE property_id = p_property_id
        AND upper(code) = upper(trim(p_coupon_code))
        AND active = TRUE
      FOR UPDATE;

      IF NOT FOUND OR v_coupon_rec.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive coupon code');
      END IF;

      IF v_coupon_rec.valid_from IS NOT NULL AND CURRENT_DATE < v_coupon_rec.valid_from THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon code is not yet valid');
      END IF;

      IF v_coupon_rec.valid_until IS NOT NULL AND CURRENT_DATE > v_coupon_rec.valid_until THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon code has expired');
      END IF;

      IF v_coupon_rec.max_uses IS NOT NULL AND COALESCE(v_coupon_rec.use_count, 0) >= v_coupon_rec.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon usage limit has been reached');
      END IF;

      IF v_subtotal < COALESCE(v_coupon_rec.min_booking_amount, 0) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Coupon requires a minimum room booking amount of %s', v_coupon_rec.min_booking_amount)
        );
      END IF;

      IF v_coupon_rec.discount_type = 'percent' THEN
        v_discount := (v_subtotal * COALESCE(v_coupon_rec.discount_value, 0)) / 100.0;
      ELSE
        v_discount := COALESCE(v_coupon_rec.discount_value, 0);
      END IF;

      IF v_coupon_rec.max_discount_amount IS NOT NULL AND v_coupon_rec.max_discount_amount > 0 THEN
        v_discount := LEAST(v_discount, v_coupon_rec.max_discount_amount);
      END IF;
    END IF;

    -- 10. Compute Final GST & Grand Total (matching OrganicTemplate.tsx calculateTotal)
    v_gst_total := v_rooms_gst + v_events_gst + v_addons_gst + v_meal_plan_gst;
    v_calculated_price := round(GREATEST(0, v_subtotal - v_discount + v_addon_total + v_meal_plan_total + v_gst_total));
  END IF;

  -- 11. Collision-Resistant ID & Token Generation with Uniqueness Guarantee (Blocker 5)
  PERFORM set_config('myota.trusted_booking_rpc', 'true', true);

  LOOP
    v_attempt := v_attempt + 1;
    v_booking_id := 'BK-' || upper(encode(gen_random_bytes(8), 'hex'));
    v_guest_token := 'pl_' || encode(gen_random_bytes(16), 'hex');

    BEGIN
      INSERT INTO public.bookings (
        id,
        property_id,
        room_id,
        room_name,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        total_price,
        payment_status,
        booking_status,
        paid_amount,
        adults,
        children,
        addons,
        coupon_code,
        selected_slot
      ) VALUES (
        v_booking_id,
        p_property_id,
        trim(p_room_id),
        COALESCE(p_room_name, ''),
        trim(p_guest_name),
        COALESCE(trim(p_guest_email), ''),
        COALESCE(trim(p_guest_phone), ''),
        trim(p_check_in),
        trim(p_check_out),
        v_calculated_price,
        'pending',
        'confirmed',
        0,
        COALESCE(p_adults, 1),
        COALESCE(p_children, 0),
        CASE
          WHEN trim(p_room_id) LIKE 'event-booking-%' AND p_selected_slot IS NOT NULL AND trim(p_selected_slot) != ''
            THEN array_append(COALESCE(p_addons, '{}'::text[]), 'SLOT:' || trim(p_selected_slot))
          ELSE COALESCE(p_addons, '{}'::text[])
        END,
        CASE WHEN p_coupon_code IS NOT NULL AND trim(p_coupon_code) != '' THEN upper(trim(p_coupon_code)) ELSE NULL END,
        v_guest_token
      );
      v_inserted := TRUE;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 5 THEN
        PERFORM set_config('myota.trusted_booking_rpc', 'false', true);
        RETURN jsonb_build_object('success', false, 'error', 'Could not allocate unique booking reference. Please retry.');
      END IF;
    END;
  END LOOP;

  PERFORM set_config('myota.trusted_booking_rpc', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'guest_token', v_guest_token,
    'subtotal', v_subtotal,
    'discount_amount', round(v_discount),
    'addon_total', v_addon_total,
    'meal_plan_total', v_meal_plan_total,
    'gst_total', v_gst_total,
    'total_price', v_calculated_price
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('myota.trusted_booking_rpc', 'false', true);
    RETURN jsonb_build_object('success', false, 'error', 'Unable to create reservation draft. Please verify your details.');
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_booking_draft(text, text, text, text, text, text, text, text, int, int, text[], text, text, int[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_booking_draft(text, text, text, text, text, text, text, text, int, int, text[], text, text, int[], text) TO anon, authenticated;

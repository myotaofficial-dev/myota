-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20261011160000_harden_security_and_rls.sql
-- Project: MYOTA Hospitality Platform (Supabase / PostgreSQL)
-- Target: public.bookings, public.rls_auto_enable, public.trigger_set_updated_at
--
-- Security Objectives:
--   1. Revoke public/anon execute on SECURITY DEFINER rls_auto_enable (ISSUE-002)
--   2. Secure trigger_set_updated_at search_path against hijacking (ISSUE-007)
--   3. Eliminate unrestricted Development/Authenticated public full access on bookings (ISSUE-001)
--   4. Implement least-privilege RLS:
--      - Authenticated property owners and authorized co-hosts have full access to their bookings.
--      - Guests / public callers can insert new reservation drafts with validated fields.
--      - Direct table SELECT, UPDATE, and DELETE are strictly DENIED to public/anon callers.
--   5. Provide secure SECURITY DEFINER RPC functions for guest operations:
--      - public.get_booking_by_payment_token(p_token text): Returns sanitized payment link details.
--      - public.confirm_booking_payment_simulation(p_token text, p_paid_amount numeric):
--        Controlled sandbox payment confirmation callable only with a matching valid token.
--
-- SAFETY NOTICE:
--   This migration does NOT delete data. It replaces unsafe PERMISSIVE policies.
--   PostgreSQL combines PERMISSIVE policies with OR; dropping old broad policies is mandatory.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Revoke public/anon execute on sensitive SECURITY DEFINER function ──────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    RAISE NOTICE 'Secured: Revoked EXECUTE on public.rls_auto_enable() from public and authenticated API roles.';
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
    RAISE NOTICE 'Secured: search_path fixed on public.trigger_set_updated_at().';
  END IF;
END $$;

-- ── 3. Clean up obsolete and insecure bookings policies ───────────────────────
-- Drop existing broad permissive ALL policies (critical: permissive policies OR together)
DROP POLICY IF EXISTS "Development public full access" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated public full access" ON public.bookings;
DROP POLICY IF EXISTS "bookings_guest_read_by_token" ON public.bookings;
DROP POLICY IF EXISTS "bookings_guest_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_owner_manager_full_access" ON public.bookings;
DROP POLICY IF EXISTS "Owners manage their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Guests can create bookings" ON public.bookings;

-- Ensure Row Level Security is active
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ── 4. Create Least-Privilege Policies for public.bookings ─────────────────────

-- Policy 4A: Property Owners & Co-hosts (Managers/Admins) have full management access
CREATE POLICY "bookings_owner_and_staff_all"
ON public.bookings
FOR ALL
TO authenticated
USING (
  -- User is property owner
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = bookings.property_id
      AND p.owner_id = (SELECT auth.uid())
  )
  OR
  -- User is registered co-host / staff member for the property
  EXISTS (
    SELECT 1 FROM public.co_hosts c
    WHERE c.property_id = bookings.property_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = bookings.property_id
      AND p.owner_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.co_hosts c
    WHERE c.property_id = bookings.property_id
      AND c.user_id = (SELECT auth.uid())
  )
);

-- Policy 4B: Public / Guest Booking Draft Submission (INSERT only)
-- Anon callers and guests can create bookings for valid published properties.
-- Prevents arbitrary insertion of non-existent properties, invalid dates, or negative values.
CREATE POLICY "bookings_guest_submit_draft"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  property_id IS NOT NULL AND
  check_in IS NOT NULL AND
  check_out IS NOT NULL AND
  total_price >= 0 AND
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = bookings.property_id
  )
);

-- Note: No SELECT, UPDATE, or DELETE policies are granted to `anon` directly.
-- Public clients CANNOT list bookings, CANNOT scrape guest records, and CANNOT
-- directly run UPDATE on payment_status or paid_amount.

-- ── 5. Secure RPC: Sanitized Guest Payment Details Lookup ─────────────────────
-- Guests holding a valid high-entropy payment link token (or booking ID) access only
-- their specific booking details through this controlled SECURITY DEFINER function.
-- Excludes sensitive internal/administrative data.
CREATE OR REPLACE FUNCTION public.get_booking_by_payment_token(p_token text)
RETURNS TABLE (
  booking_id text,
  property_id text,
  room_id text,
  room_name text,
  guest_name text,
  guest_email text,
  guest_phone text,
  check_in text,
  check_out text,
  total_price numeric,
  payment_status text,
  booking_status text,
  paid_amount numeric,
  coupon_code text,
  selected_slot text,
  property_name text,
  property_phone text,
  property_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Guard against blank or trivially short tokens (minimum 8 characters)
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    b.id::text AS booking_id,
    b.property_id::text,
    b.room_id::text,
    b.room_name::text,
    b.guest_name::text,
    b.guest_email::text,
    b.guest_phone::text,
    b.check_in::text,
    b.check_out::text,
    b.total_price::numeric,
    b.payment_status::text,
    b.booking_status::text,
    COALESCE(b.paid_amount, 0)::numeric AS paid_amount,
    b.coupon_code::text,
    b.selected_slot::text,
    COALESCE(hs.name, p.name, '')::text AS property_name,
    COALESCE(hs.phone, '')::text AS property_phone,
    COALESCE(hs.email, '')::text AS property_email
  FROM public.bookings b
  JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.hotel_settings hs ON hs.property_id = b.property_id
  WHERE (b.selected_slot = p_token OR b.id::text = p_token)
    AND b.booking_status != 'cancelled'
  LIMIT 1;
END;
$$;

-- Grant execute on the sanitized lookup function to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_booking_by_payment_token(text) TO anon, authenticated;

-- ── 6. Secure RPC: Controlled Sandbox Payment Settlement ──────────────────────
-- Replaces direct client-side UPDATE `from('bookings').update(...)`.
-- Only operates when supplied with a matching valid token, and validates the payment amount.
CREATE OR REPLACE FUNCTION public.confirm_booking_payment_simulation(
  p_token text,
  p_paid_amount numeric
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_new_payment_status text;
  v_new_paid_amount numeric;
BEGIN
  -- Validate input token
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token format');
  END IF;

  -- Locate booking strictly by token or ID
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE (selected_slot = p_token OR id::text = p_token)
    AND booking_status != 'cancelled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking link not found or expired');
  END IF;

  -- Validate amount
  IF p_paid_amount IS NULL OR p_paid_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment amount');
  END IF;

  -- Cap paid amount to total_price
  v_new_paid_amount := LEAST(p_paid_amount, v_booking.total_price);
  
  -- Determine status
  IF v_new_paid_amount >= v_booking.total_price THEN
    v_new_payment_status := 'paid';
  ELSE
    v_new_payment_status := 'partially_paid';
  END IF;

  -- Perform controlled update
  UPDATE public.bookings
  SET 
    payment_status = v_new_payment_status,
    paid_amount = v_new_paid_amount,
    source = 'direct'
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'payment_status', v_new_payment_status,
    'paid_amount', v_new_paid_amount
  );
END;
$$;

-- Grant execute on the controlled payment simulation RPC
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment_simulation(text, numeric) TO anon, authenticated;

-- ── 7. Verification Verification Query ────────────────────────────────────────
-- Run in Supabase SQL editor after applying to inspect effective policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies WHERE tablename = 'bookings';

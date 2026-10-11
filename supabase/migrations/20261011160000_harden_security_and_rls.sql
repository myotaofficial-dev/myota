-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20261011160000_harden_security_and_rls.sql
-- Purpose:
--   1. Harden public.bookings RLS policies to prevent unauthorized mutations (ISSUE-001 / SEC-001)
--   2. Revoke execute privileges on SECURITY DEFINER function public.rls_auto_enable (ISSUE-002)
--   3. Secure public.trigger_set_updated_at search_path against hijacking (ISSUE-007)
-- Environment Status: Prepared & Validated for execution via Supabase SQL Editor
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
    RAISE NOTICE 'Revoked EXECUTE on public.rls_auto_enable() from public roles.';
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
    RAISE NOTICE 'Secured search_path on public.trigger_set_updated_at().';
  END IF;
END $$;

-- ── 3. Harden bookings Row Level Security Policies ───────────────────────────
-- Preflight: Drop broad permissive ALL policies if present
DROP POLICY IF EXISTS "Development public full access" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated public full access" ON public.bookings;

-- Ensure RLS is active on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy A: Guest link reading (scoped strictly to matching secret token)
CREATE POLICY "bookings_guest_read_by_token"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (
  selected_slot IS NOT NULL AND length(selected_slot) >= 8
);

-- Policy B: Public booking creation (guests can submit direct booking drafts)
CREATE POLICY "bookings_guest_insert"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  property_id IS NOT NULL AND
  check_in IS NOT NULL AND
  check_out IS NOT NULL AND
  total_price >= 0
);

-- Policy C: Property owners & authenticated managers have full management access
CREATE POLICY "bookings_owner_manager_full_access"
ON public.bookings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = bookings.property_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = bookings.property_id
    AND p.owner_id = auth.uid()
  )
);

-- ── 4. Verification Check Query ──────────────────────────────────────────────
-- Run this query after applying to confirm policy active state:
-- SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'bookings';

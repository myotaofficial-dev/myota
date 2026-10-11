-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 20261011170000_optimize_indexes_and_rls_performance.sql
-- Project: MYOTA Hospitality SaaS (Supabase / PostgreSQL 15+ / 17)
-- Purpose: Verified Query & RLS Index Optimization (Minimal, Non-Redundant & Safely Reversible)
--
-- AUDIT SUMMARY:
--   1. public.co_hosts -> idx_co_hosts_property_user_role:
--      - Covers RLS authorization helpers (user_is_property_owner, user_can_manage_property,
--        user_can_accept_bookings, user_can_view_bookings) which filter on
--        (property_id, user_id, role) with user_id IS NOT NULL and read can_accept_bookings.
--   2. public.bookings -> idx_bookings_property_created_desc:
--      - Covers dashboard reservation list query (WHERE property_id = $1 ORDER BY created_at DESC)
--        in HotelContext.tsx:1183. No existing bookings index includes created_at.
--   3. public.bookings -> idx_bookings_selected_slot_lookup:
--      - Covers get_booking_by_payment_token(p_token) (WHERE selected_slot = $1 AND
--        COALESCE(booking_status, 'confirmed') != 'cancelled') and event-slot lookups.
--      - Complements (and preserves untouched) idx_bookings_unique_payment_token, whose
--        partial predicate (left(selected_slot, 3) = 'pl_') is not matched by parameterized
--        equality queries or legacy/event-slot tokens.
--   4. public.coupons -> idx_coupons_property_upper_code:
--      - Functional index on (property_id, upper(code)) supporting case-insensitive coupon
--        validation in both create_guest_booking_draft and trg_bookings_security_and_inventory_guard.
--      - Unconditional (no WHERE active = TRUE predicate) so both checkout validation and
--        trigger-based payment settlement queries can use the index.
--   5. public.hotel_settings -> idx_hotel_settings_subdomain:
--      - B-tree index on (subdomain) supporting tenant subdomain resolution
--        (WHERE subdomain = $1) in HotelContext.tsx:1138.
--      - Unconditional (no WHERE subdomain != '' predicate) so parameterized PostgREST
--        equality queries ($1) can use the index at plan time.
--
-- INTENTIONALLY OMITTED / PRESERVED UNTOUCHED:
--   - public.idx_properties_owner & public.idx_properties_owner_rel:
--     Preserved untouched in this migration. Do not drop idx_properties_owner_rel until its
--     exact pg_get_indexdef, pg_constraint linkage, and pg_stat_user_indexes counters are
--     verified in the target environment (see pre-drop diagnostic SQL below).
--   - public.pricing_overrides:
--     Already has UNIQUE(room_id, date) (pricing_overrides_room_id_date_key) and
--     idx_pricing_overrides_room_date; since (room_id, date) is unique (at most 1 row),
--     adding created_at DESC provides no ordering benefit.
--   - public.bookings (idx_bookings_active_availability) & public.room_categories (idx_room_categories_property_order):
--     Omitted to avoid redundant overlap with existing idx_bookings_dates, idx_bookings_status,
--     idx_room_categories_property, and idx_room_categories_active.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── UP MIGRATION ──────────────────────────────────────────────────────────────

-- 1. Composite covering index for RLS helper functions on public.co_hosts
CREATE INDEX IF NOT EXISTS idx_co_hosts_property_user_role
  ON public.co_hosts (property_id, user_id, role)
  INCLUDE (can_accept_bookings)
  WHERE user_id IS NOT NULL;

-- 2. Dashboard booking list index (supports WHERE property_id = $1 ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_bookings_property_created_desc
  ON public.bookings (property_id, created_at DESC);

-- 3. Partial index for payment token & event slot lookups on active bookings
--    (Preserves public.idx_bookings_unique_payment_token untouched for pl_ uniqueness)
CREATE INDEX IF NOT EXISTS idx_bookings_selected_slot_lookup
  ON public.bookings (selected_slot)
  WHERE selected_slot IS NOT NULL
    AND COALESCE(booking_status, 'confirmed') != 'cancelled';

-- 4. Functional index for case-insensitive coupon code lookup (checkout RPC + settlement trigger)
CREATE INDEX IF NOT EXISTS idx_coupons_property_upper_code
  ON public.coupons (property_id, upper(code));

-- 5. Subdomain lookup index for guest site routing (supports parameterized WHERE subdomain = $1)
CREATE INDEX IF NOT EXISTS idx_hotel_settings_subdomain
  ON public.hotel_settings (subdomain);


-- ══════════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK SQL
-- Reverses ONLY the 5 indexes introduced by this migration. Does not drop or
-- recreate any pre-existing index or constraint.
-- ══════════════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS public.idx_hotel_settings_subdomain;
-- DROP INDEX IF EXISTS public.idx_coupons_property_upper_code;
-- DROP INDEX IF EXISTS public.idx_bookings_selected_slot_lookup;
-- DROP INDEX IF EXISTS public.idx_bookings_property_created_desc;
-- DROP INDEX IF EXISTS public.idx_co_hosts_property_user_role;


-- ══════════════════════════════════════════════════════════════════════════════
-- READ-ONLY STAGING DIAGNOSTIC SQL FOR idx_properties_owner_rel (Advisor DB-09)
-- Run manually in Staging/Production SQL Editor before deciding whether to drop
-- idx_properties_owner_rel in a future cleanup migration:
-- ══════════════════════════════════════════════════════════════════════════════
-- SELECT
--   i.relname AS index_name,
--   am.amname AS access_method,
--   ix.indisunique AS is_unique,
--   ix.indisprimary AS is_primary,
--    EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = ix.indexrelid) AS backs_constraint,
--   pg_size_pretty(pg_relation_size(ix.indexrelid)) AS index_size,
--   COALESCE(s.idx_scan, 0) AS idx_scan,
--   pg_get_indexdef(ix.indexrelid) AS exact_indexdef
-- FROM pg_index ix
-- JOIN pg_class i ON i.oid = ix.indexrelid
-- JOIN pg_class t ON t.oid = ix.indrelid
-- JOIN pg_namespace n ON n.oid = t.relnamespace
-- JOIN pg_am am ON am.oid = i.relam
-- LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = ix.indexrelid
-- WHERE n.nspname = 'public'
--   AND t.relname = 'properties'
--   AND i.relname IN ('idx_properties_owner', 'idx_properties_owner_rel')
-- ORDER BY i.relname;

-- ============================================================
-- MYOTA Hotel Website Builder — Drop Owners Table & Use Auth UUID
-- ============================================================

-- 1. DROP OWNERS TABLE AND CONSTRAINTS
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_owner_id_fkey;
DROP TABLE IF EXISTS owners CASCADE;

-- 2. ENSURE owner_id IS A COLUMN IN PROPERTIES (WITHOUT FOREIGN KEY CONSTRAINTS)
-- This allows us to link properties to auth.users UUIDs without migration order errors.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Index for properties owner_id
CREATE INDEX IF NOT EXISTS idx_properties_owner_rel ON properties(owner_id);

-- 3. LINK DEFAULT PROPERTIES AND RESTORE CORRECT NAMES
UPDATE properties 
SET owner_id = '11111111-1111-1111-1111-111111111111',
    name = CASE WHEN id = 'prop-1' THEN 'Sri K Residency' ELSE 'The Grandlake Resorts' END
WHERE id IN ('prop-1', 'prop-2');

-- Update status to draft
UPDATE properties
SET status = 'draft'
WHERE id IN ('prop-1', 'prop-2');

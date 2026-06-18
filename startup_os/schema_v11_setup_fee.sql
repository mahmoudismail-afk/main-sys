-- ==========================================
-- SCHEMA V11: Initial Setup Fees
-- ==========================================

ALTER TABLE engagements ADD COLUMN IF NOT EXISTS setup_fee NUMERIC(10, 2);

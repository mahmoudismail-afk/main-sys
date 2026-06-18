-- ==========================================
-- SCHEMA V14: Restore Client Billing Columns
-- ==========================================
-- When the master database reset occurred, the billing columns from V2 
-- were accidentally omitted. This restores them cleanly.

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT;

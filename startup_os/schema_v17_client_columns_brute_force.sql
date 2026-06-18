-- ==========================================
-- SCHEMA V17: Brute Force Client Columns
-- ==========================================

-- This script forcefully adds every single possible column to the clients table 
-- that the frontend could ever ask for, and then brutally forces the cache to reset.

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS onboarding_step TEXT;

-- Force the API cache to completely reload
NOTIFY pgrst, 'reload schema';

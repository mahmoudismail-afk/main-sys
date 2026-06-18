-- ==========================================
-- SCHEMA V5: Client Model Update
-- ==========================================

-- 1. Add new columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Drop the health_score column as requested
ALTER TABLE clients DROP COLUMN IF EXISTS health_score;

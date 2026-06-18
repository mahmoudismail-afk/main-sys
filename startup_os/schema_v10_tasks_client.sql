-- ==========================================
-- SCHEMA V10: Add Client to Tasks
-- ==========================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

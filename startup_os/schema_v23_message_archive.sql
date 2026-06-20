-- ==========================================
-- SCHEMA V23: Message Center Archive
-- ==========================================

ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

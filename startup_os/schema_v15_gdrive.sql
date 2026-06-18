-- ==========================================
-- SCHEMA V15: Restore GDrive Folder ID
-- ==========================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT;

-- Force the API cache to reload so it immediately recognizes the new columns
NOTIFY pgrst, 'reload schema';

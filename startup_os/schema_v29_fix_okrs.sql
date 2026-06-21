-- Safely add potentially missing columns to okrs
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS type text DEFAULT 'objective';
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started';

-- Safely add potentially missing columns to decisions_log
ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS context text;
ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS outcome text;

-- Force Supabase to rebuild its schema cache
NOTIFY pgrst, 'reload schema';

-- We cannot drop the table because the `roadmaps` table depends on it.
-- Instead, we will safely inject every required column to guarantee they exist without destroying the table relationships.

ALTER TABLE okrs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS type text DEFAULT 'objective';
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started';

ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS context text;
ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE decisions_log ADD COLUMN IF NOT EXISTS outcome text;

-- Force Supabase to rebuild its schema cache
NOTIFY pgrst, 'reload schema';

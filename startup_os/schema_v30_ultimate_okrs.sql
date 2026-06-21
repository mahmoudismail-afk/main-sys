-- Since the tables are currently empty and throwing cache errors, we will cleanly drop and recreate them to guarantee the perfect structure.

DROP TABLE IF EXISTS okrs;
DROP TABLE IF EXISTS decisions_log;

CREATE TABLE okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'objective',
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE decisions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  context text,
  rationale text,
  outcome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on okrs" 
  ON okrs FOR ALL 
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on decisions_log" 
  ON decisions_log FOR ALL 
  USING (true) WITH CHECK (true);

-- Force Supabase to rebuild its schema cache
NOTIFY pgrst, 'reload schema';

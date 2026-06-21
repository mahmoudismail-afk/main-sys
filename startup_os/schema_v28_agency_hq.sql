-- Create OKRs table
CREATE TABLE IF NOT EXISTS okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL, -- 'objective' or 'key_result'
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Decisions Log table
CREATE TABLE IF NOT EXISTS decisions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  context text,
  rationale text,
  outcome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies (Open access for now, similar to other tables)
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on okrs" 
  ON okrs FOR ALL 
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on decisions_log" 
  ON decisions_log FOR ALL 
  USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

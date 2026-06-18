-- ==========================================
-- SCHEMA V20: Company Settings
-- ==========================================

CREATE TABLE IF NOT EXISTS company_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON company_settings;
CREATE POLICY "Allow all access" ON company_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed initial buffer if it doesn't exist
INSERT INTO company_settings (key, value) 
VALUES ('min_cash_buffer', '{"amount": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

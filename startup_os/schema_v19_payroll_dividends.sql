-- ==========================================
-- SCHEMA V19: Payroll & Dividends
-- ==========================================

-- 1. Payroll (Salaries & Bonuses)
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_name TEXT NOT NULL,
    role TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT DEFAULT 'salary', -- salary, bonus, contractor
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dividends (Owner Distributions)
CREATE TABLE IF NOT EXISTS dividends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_id UUID REFERENCES business_equity(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'distributed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Open Access Policy Application
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON payroll;
DROP POLICY IF EXISTS "Allow all access" ON dividends;

CREATE POLICY "Allow all access" ON payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON dividends FOR ALL USING (true) WITH CHECK (true);

-- Force PostgREST cache to completely reload
NOTIFY pgrst, 'reload schema';

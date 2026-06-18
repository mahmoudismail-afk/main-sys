-- ==========================================
-- SCHEMA V6: Equity & RLS Fix
-- ==========================================

-- 1. Ensure the table exists (in case V4 was skipped)
CREATE TABLE IF NOT EXISTS business_equity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_name TEXT NOT NULL,
    role TEXT,
    equity_percentage NUMERIC,
    shares_held INTEGER,
    vesting_schedule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disable Row Level Security (RLS) on the new tables. 
-- Since we haven't built the Login/Auth system yet, Supabase's security rules are automatically blocking your saves!
ALTER TABLE business_equity DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- SCHEMA V7: The Master Fix
-- ==========================================
-- It looks like the original V4 script was skipped, so the database is missing these tables entirely. 
-- This script safely builds them all from scratch and disables the security blocks.

-- 1. Business Equity
CREATE TABLE IF NOT EXISTS business_equity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_name TEXT NOT NULL,
    role TEXT,
    equity_percentage NUMERIC,
    shares_held INTEGER,
    vesting_schedule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_method TEXT,
    payment_date DATE DEFAULT CURRENT_DATE,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hardware Inventory
CREATE TABLE IF NOT EXISTS hardware_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    hardware_type TEXT,
    mac_address TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Disable Row Level Security (RLS) to allow local testing without Login credentials
ALTER TABLE business_equity DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_inventory DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- SCHEMA V4: Sidebar Granularity Expansion
-- ==========================================

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

-- 2. Payments (Ledger for incoming cash)
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

-- Ensure hardware_inventory exists for Inventory UI
CREATE TABLE IF NOT EXISTS hardware_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    hardware_type TEXT,
    mac_address TEXT,
    status TEXT DEFAULT 'active'
);

ALTER TABLE business_equity ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY['business_equity', 'payments', 'reminders'];
BEGIN 
    FOREACH t IN ARRAY tables 
    LOOP 
        EXECUTE format('CREATE POLICY "Founders full access %I" ON %I FOR ALL USING (auth.is_business_founder() OR auth.is_dev_founder())', t, t);
    END LOOP; 
END $$;

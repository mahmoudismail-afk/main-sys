-- ==========================================
-- THE ULTIMATE MASTER SCHEMA (V8)
-- ==========================================
-- Do not run any previous scripts! This is the complete, all-in-one database build.
-- Copy and paste this entire file into your Supabase SQL Editor and hit RUN.
-- It creates all tables and disables security blocks so your local app works perfectly.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CRM & Clients
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'onboarding',
    billing_email TEXT,
    billing_address TEXT,
    tax_id TEXT,
    phone TEXT,
    notes TEXT,
    onboarding_step TEXT,
    gdrive_folder_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    stage TEXT,
    value NUMERIC(10, 2),
    close_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Engagements & Invoicing
CREATE TABLE IF NOT EXISTS engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contract_value NUMERIC(10, 2),
    start_date DATE,
    end_date DATE,
    status TEXT,
    billing_cycle TEXT,
    auto_invoice BOOLEAN DEFAULT false,
    next_invoice_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT,
    due_date DATE,
    issued_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 3. Operations & Planning
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    priority TEXT,
    status TEXT,
    due_date DATE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    engagement_id UUID REFERENCES engagements(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    meeting_date TIMESTAMPTZ,
    status TEXT
);

-- 4. Finance & Capital
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_equity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_name TEXT NOT NULL,
    role TEXT,
    equity_percentage NUMERIC,
    shares_held INTEGER,
    vesting_schedule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funding_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    target_amount NUMERIC,
    raised_amount NUMERIC,
    target_date DATE,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Deployments & Inventory
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    environment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hardware_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    hardware_type TEXT,
    mac_address TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Profitability View (Analyzes revenue automatically)
DROP VIEW IF EXISTS client_profitability_view;
CREATE VIEW client_profitability_view AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_revenue,
    0 AS total_infrastructure_cost,
    (COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0)) AS net_margin,
    100 AS margin_percentage
FROM 
    clients c
LEFT JOIN 
    invoices i ON c.id = i.client_id
GROUP BY 
    c.id, c.name;

-- 7. Safety Overrides (Disable security blocks for local testing without logins)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads_pipeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_equity DISABLE ROW LEVEL SECURITY;
ALTER TABLE funding_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE deployments DISABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_inventory DISABLE ROW LEVEL SECURITY;

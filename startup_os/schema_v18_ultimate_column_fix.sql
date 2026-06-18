-- ==========================================
-- SCHEMA V18: Ultimate Column Fix
-- ==========================================
-- Because "CREATE TABLE IF NOT EXISTS" doesn't add missing columns to existing tables,
-- older versions of your tables were missing new fields. This forcefully injects them.

-- 1. INVOICES
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();

-- 2. PAYMENTS
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- 3. ENGAGEMENTS
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS setup_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS contract_value NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_invoice_date DATE;

-- 4. TASKS
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES engagements(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Force the API cache to completely reload
NOTIFY pgrst, 'reload schema';

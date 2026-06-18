-- ==========================================
-- SCHEMA V2: Automation & Expansion
-- ==========================================

-- 1. Update expenses category constraint to include 'subscriptions'
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check CHECK (category IN ('infrastructure', 'capital', 'hardware', 'subscriptions', 'other'));

-- 2. Expand clients table with granular billing details
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- 3. Create client_members table for contacts
CREATE TABLE IF NOT EXISTS client_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business founder full access client_members" ON client_members FOR ALL USING (auth.is_business_founder());
CREATE POLICY "Dev founder read access client_members" ON client_members FOR SELECT USING (auth.is_dev_founder());

-- 4. Expand engagements table for auto-invoicing
ALTER TABLE engagements 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'weekly', 'annually')),
ADD COLUMN IF NOT EXISTS auto_invoice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_invoice_date DATE;

-- 5. Auto Invoicing Logic (Requires pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION process_auto_invoices()
RETURNS void AS $$
DECLARE
    eng RECORD;
BEGIN
    -- Find all engagements marked for auto-invoicing where the due date has arrived
    FOR eng IN 
        SELECT id, client_id, contract_value, next_invoice_date, billing_cycle 
        FROM engagements 
        WHERE auto_invoice = true AND next_invoice_date <= CURRENT_DATE
    LOOP
        -- Automatically insert a Draft invoice for Net 14 terms
        INSERT INTO invoices (client_id, engagement_id, amount, status, due_date)
        VALUES (eng.client_id, eng.id, eng.contract_value, 'draft', CURRENT_DATE + INTERVAL '14 days');

        -- Push the next_invoice_date forward based on the cycle
        UPDATE engagements 
        SET next_invoice_date = CASE 
            WHEN eng.billing_cycle = 'monthly' THEN eng.next_invoice_date + INTERVAL '1 month'
            WHEN eng.billing_cycle = 'weekly' THEN eng.next_invoice_date + INTERVAL '1 week'
            WHEN eng.billing_cycle = 'annually' THEN eng.next_invoice_date + INTERVAL '1 year'
            ELSE eng.next_invoice_date + INTERVAL '1 month'
        END
        WHERE id = eng.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run daily at midnight
-- NOTE: Uncomment this line to activate the cron job in your database
-- SELECT cron.schedule('auto_invoices_daily', '0 0 * * *', 'SELECT process_auto_invoices()');

-- ==========================================
-- SCHEMA V24: Security Lockdown (Authenticated Users Only)
-- ==========================================
-- This script reverses the "Open Access" vulnerability.
-- It ensures that ONLY users who are actively logged in 
-- via Supabase Auth can read, write, or modify data.
-- 
-- IMPORTANT: You must disable "Enable signups" in your
-- Supabase Dashboard to prevent strangers from creating accounts!

DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY[
        'okrs', 'decisions_log', 'knowledge_base', 
        'clients', 'leads_pipeline', 'engagements', 'communications', 
        'roadmap_tasks', 'deployments', 'hardware_inventory', 'sync_logs', 
        'invoices', 'expenses', 'client_members', 'deliverables', 
        'payroll', 'dividends', 'company_settings', 
        'message_threads', 'thread_messages', 'projects', 'tasks', 
        'meetings', 'documents', 'marketing_campaigns', 'employee_records', 
        'job_applicants', 'contracts', 'compliance_logs', 'investors', 
        'funding_milestones', 'support_tickets', 'business_equity', 
        'payments', 'reminders'
    ];
BEGIN 
    FOREACH t IN ARRAY tables 
    LOOP 
        -- 1. Ensure Row Level Security is active
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
        
        -- 2. Drop the dangerous "Allow all access" policy
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I;', t);

        -- 3. Drop the new policy if it exists (so this script is idempotent)
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users" ON %I;', t);
        
        -- 4. Create the secure policy: Only logged-in users can access
        EXECUTE format('CREATE POLICY "Allow authenticated users" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'');', t);
    END LOOP; 
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

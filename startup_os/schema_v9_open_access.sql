-- ==========================================
-- SCHEMA V9: The Bulletproof RLS Override
-- ==========================================
-- If Supabase is still blocking you, it's because it sometimes ignores the "DISABLE RLS" command 
-- for anonymous API requests unless there is an explicit "ALLOW" policy.
-- This script creates a blanket "Allow Everything" policy for all tables.

DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY[
        'clients', 'leads_pipeline', 'engagements', 'invoices', 'payments',
        'projects', 'tasks', 'reminders', 'meetings', 'expenses',
        'business_equity', 'funding_milestones', 'deployments', 'hardware_inventory'
    ];
BEGIN 
    FOREACH t IN ARRAY tables 
    LOOP 
        -- 1. Enable RLS so Supabase respects the policy engine
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
        
        -- 2. Drop the policy if it already exists to prevent duplicate errors
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON %I;', t);
        
        -- 3. Create a blanket policy allowing ALL operations (Read/Write/Delete) for everyone
        EXECUTE format('CREATE POLICY "Allow all access" ON %I FOR ALL USING (true) WITH CHECK (true);', t);
    END LOOP; 
END $$;

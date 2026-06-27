-- ==========================================
-- 1. Create Organizations Table FIRST
-- ==========================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Organization
INSERT INTO organizations (id, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Default Organization') 
ON CONFLICT DO NOTHING;

-- ==========================================
-- 2. Create or Update Profiles Table
-- ==========================================
-- Ensure the table exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Forcefully add missing columns if they don't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '11111111-1111-1111-1111-111111111111',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'member')),
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill profiles for all existing users in auth.users using dynamic SQL to avoid parse-time errors
DO $$ 
BEGIN
  EXECUTE '
    INSERT INTO profiles (id, organization_id, role)
    SELECT id, ''11111111-1111-1111-1111-111111111111'', ''super_admin'' FROM auth.users
    ON CONFLICT (id) DO UPDATE SET 
      organization_id = EXCLUDED.organization_id, 
      role = EXCLUDED.role;
  ';
END $$;

-- ==========================================
-- 3. JWT Claim Syncing
-- ==========================================
CREATE OR REPLACE FUNCTION sync_profile_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('organization_id', NEW.organization_id, 'role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_change ON profiles;
CREATE TRIGGER on_profile_change
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_profile_to_jwt();

-- Sync existing profiles to auth.users immediately
UPDATE auth.users u
SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('organization_id', p.organization_id, 'role', p.role)
FROM profiles p
WHERE u.id = p.id;

-- ==========================================
-- 4. Update Core Tables with organization_id
-- ==========================================
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('okrs', 'decisions_log', 'knowledge_base', 'clients', 'leads_pipeline', 'engagements', 'communications', 'roadmap_tasks', 'deployments', 'hardware_inventory', 'sync_logs', 'invoices', 'expenses', 'business_equity', 'dividends', 'funding_milestones', 'payroll', 'payments', 'setups_fees')
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT ''11111111-1111-1111-1111-111111111111''', t);
    END LOOP;
END $$;

-- ==========================================
-- 5. Debt Tracking Module
-- ==========================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  debtor_name TEXT NOT NULL,
  debtor_id UUID,
  amount NUMERIC(10, 2) NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'USD',
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'canceled', 'cleared', 'defaulted')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION block_debt_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard deletions on the debts table are prohibited for audit compliance.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_block_debt_deletion ON debts;
CREATE TRIGGER trigger_block_debt_deletion
BEFORE DELETE ON debts
FOR EACH ROW EXECUTE FUNCTION block_debt_deletion();

-- ==========================================
-- 6. Clean RLS Policies
-- ==========================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Apply New RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can manage organizations" ON organizations
FOR ALL USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' );
CREATE POLICY "Users can read own organization" ON organizations
FOR SELECT USING ( id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid );

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read org profiles" ON profiles
FOR SELECT USING ( organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' );
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING ( id = auth.uid() );
CREATE POLICY "Super admins can manage profiles" ON profiles
FOR ALL USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' );

DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('okrs', 'decisions_log', 'knowledge_base', 'clients', 'leads_pipeline', 'engagements', 'communications', 'roadmap_tasks', 'deployments', 'hardware_inventory', 'sync_logs', 'invoices', 'expenses', 'business_equity', 'dividends', 'funding_milestones', 'payroll', 'payments', 'setups_fees', 'debts', 'debt_payments')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "Tenant isolation for %I" ON %I FOR ALL USING ( organization_id = (auth.jwt() -> ''app_metadata'' ->> ''organization_id'')::uuid OR (auth.jwt() -> ''app_metadata'' ->> ''role'') = ''super_admin'' )', t, t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

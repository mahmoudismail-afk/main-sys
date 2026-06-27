-- ==========================================
-- FINAL MASTER SCRIPT: ARCHITECTURE + IAM
-- Safely built against your exact schema structure.
-- ==========================================

-- 1. Create Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO organizations (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Default Organization') ON CONFLICT DO NOTHING;

-- 2. Fix Profiles Table
-- Your schema has full_name NOT NULL, which crashes new user inserts. We'll drop the constraint and add our new columns.
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure all existing users get super_admin
UPDATE public.profiles SET role = 'super_admin';

-- Backfill missing profiles from auth.users (Dynamic SQL)
DO $$ 
BEGIN
  EXECUTE '
    INSERT INTO public.profiles (id, organization_id, role, full_name)
    SELECT id, ''11111111-1111-1111-1111-111111111111'', ''super_admin'', ''Imported User'' FROM auth.users
    ON CONFLICT (id) DO UPDATE SET 
      organization_id = EXCLUDED.organization_id, 
      role = EXCLUDED.role;
  ';
END $$;

-- 3. JWT Claim Syncing Trigger
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

-- Sync immediately
UPDATE auth.users u
SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('organization_id', p.organization_id, 'role', p.role)
FROM public.profiles p
WHERE u.id = p.id;

-- 4. Debts Module
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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
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


-- 5. Add organization_id to all standard tables
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
      'okrs', 'decisions', 'wiki_pages', 'clients', 'leads', 'meetings', 'releases', 'roadmaps', 
      'tenant_deployments', 'sprints_tasks', 'support_tickets', 'hardware_inventory', 'invoices', 
      'expenses', 'business_equity', 'payments', 'reminders', 'leads_pipeline', 'engagements', 
      'projects', 'tasks', 'funding_milestones', 'deployments', 'client_members', 'decisions_log', 
      'roadmap_tasks', 'sync_logs', 'deliverables', 'payroll', 'dividends', 'message_threads', 'thread_messages'
    )
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT ''11111111-1111-1111-1111-111111111111''', t);
    END LOOP;
END $$;


-- 6. Super Admin IAM RPCs
CREATE OR REPLACE FUNCTION admin_verify_and_assign_user(
  target_email TEXT,
  org_id UUID,
  user_role TEXT,
  first_name TEXT
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can verify global users.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in authentication system.';
  END IF;

  -- 1. Force verify the email so they can log in immediately
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user_id;

  -- 2. Insert profile or update if it already exists
  INSERT INTO public.profiles (id, organization_id, role, first_name, full_name)
  VALUES (v_user_id, org_id, user_role, first_name, first_name)
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    full_name = EXCLUDED.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to delete users entirely (requires super_admin)
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied: Only super_admin can delete users.';
  END IF;

  -- Explicitly delete the profile first (in case ON DELETE CASCADE is missing)
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete the core auth identity
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_user_org(
  target_user_id UUID,
  new_org_id UUID,
  new_role TEXT
) RETURNS VOID AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can reassign users.';
  END IF;

  UPDATE public.profiles
  SET organization_id = new_org_id, role = new_role, updated_at = now()
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Clean existing RLS and apply new JWT-based RLS
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can manage organizations" ON organizations FOR ALL USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' );
CREATE POLICY "Users can read own organization" ON organizations FOR SELECT USING ( id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid );

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read org profiles" ON profiles FOR SELECT USING ( organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' );
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ( id = auth.uid() );
CREATE POLICY "Super admins can manage profiles" ON profiles FOR ALL USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' );

DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
      'okrs', 'decisions', 'wiki_pages', 'clients', 'leads', 'meetings', 'releases', 'roadmaps', 
      'tenant_deployments', 'sprints_tasks', 'support_tickets', 'hardware_inventory', 'invoices', 
      'expenses', 'business_equity', 'payments', 'reminders', 'leads_pipeline', 'engagements', 
      'projects', 'tasks', 'funding_milestones', 'deployments', 'client_members', 'decisions_log', 
      'roadmap_tasks', 'sync_logs', 'deliverables', 'payroll', 'dividends', 'message_threads', 'thread_messages', 'debts', 'debt_payments'
    )
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "Tenant isolation for %I" ON %I FOR ALL USING ( organization_id = (auth.jwt() -> ''app_metadata'' ->> ''organization_id'')::uuid OR (auth.jwt() -> ''app_metadata'' ->> ''role'') = ''super_admin'' )', t, t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

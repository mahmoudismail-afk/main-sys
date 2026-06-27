-- Fix existing profiles table by adding the new columns before inserting data
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT '11111111-1111-1111-1111-111111111111',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'member')),
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Now backfill profiles for all existing users in auth.users
INSERT INTO profiles (id, organization_id, role)
SELECT id, '11111111-1111-1111-1111-111111111111', 'super_admin' FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
  organization_id = EXCLUDED.organization_id, 
  role = EXCLUDED.role;

-- ==========================================
-- 1. Create User via Super Admin RPC
-- ==========================================
CREATE OR REPLACE FUNCTION admin_create_user(
  email TEXT,
  password TEXT,
  org_id UUID,
  user_role TEXT,
  first_name TEXT
) RETURNS UUID AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  -- Security Check: Only super admins can execute this function
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can create global users.';
  END IF;

  -- 1. Insert into auth.users (Supabase GoTrue)
  INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at, 
    role, 
    aud, 
    confirmation_token
  )
  VALUES (
    new_id, 
    '00000000-0000-0000-0000-000000000000', 
    email, 
    crypt(password, gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now(), 
    'authenticated', 
    'authenticated', 
    ''
  );

  -- 2. Insert into public.profiles
  -- The on_profile_change trigger will automatically sync the role and org_id into the JWT
  INSERT INTO public.profiles (id, organization_id, role, first_name)
  VALUES (new_id, org_id, user_role, first_name);

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. Move User to Different Organization RPC
-- ==========================================
CREATE OR REPLACE FUNCTION admin_update_user_org(
  target_user_id UUID,
  new_org_id UUID,
  new_role TEXT
) RETURNS VOID AS $$
BEGIN
  -- Security Check: Only super admins can execute this function
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admins can reassign users.';
  END IF;

  -- Update the user's profile
  -- The on_profile_change trigger will automatically sync the new role and org_id into the JWT
  UPDATE public.profiles
  SET organization_id = new_org_id,
      role = new_role,
      updated_at = now()
  WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Force Schema Reload so the RPCs are exposed to PostgREST
NOTIFY pgrst, 'reload schema';

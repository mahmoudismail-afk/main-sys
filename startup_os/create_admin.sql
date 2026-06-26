DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- 1. Create the user in Supabase Auth with the requested email and password
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
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'm@startupos.com',
    crypt('112233', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    ''
  );

  -- 2. Insert into profiles and assign Super Admin role
  -- Note: The database trigger we created earlier will automatically intercept this insert
  -- and securely inject the super_admin role into the user's JWT token.
  INSERT INTO public.profiles (id, organization_id, role, first_name)
  VALUES (
    new_user_id,
    '11111111-1111-1111-1111-111111111111', -- Default Organization
    'super_admin',
    'Global Admin M'
  );
END $$;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmumcejifxfszjzjzjjl.supabase.co';
const supabaseKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('Attempting to create admin account...');
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@startupos.com',
    password: '123456'
  });
  
  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('Successfully created admin account!');
  }
}

createAdmin();

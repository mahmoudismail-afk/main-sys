import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmumcejifxfszjzjzjjl.supabase.co';
const supabaseKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'mhyo_sdk@startupos.com',
    password: 'password123'
  });
  console.log("SignUp Data:", data);
  console.log("SignUp Error:", error);
}

test();

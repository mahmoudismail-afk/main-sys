import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmumcejifxfszjzjzjjl.supabase.co';
const supabaseKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'mhyo@startupos.com',
    password: '123456'
  });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();

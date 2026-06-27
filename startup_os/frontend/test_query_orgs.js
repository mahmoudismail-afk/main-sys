const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mmumcejifxfszjzjzjjl.supabase.co';
const supabaseKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('organizations').select('*');
  console.log("Organizations:");
  console.log(data);
  if (error) console.error("Error:", error);
}

test();

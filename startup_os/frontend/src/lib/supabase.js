import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmumcejifxfszjzjzjjl.supabase.co';
const supabaseKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';

export const supabase = createClient(supabaseUrl, supabaseKey);

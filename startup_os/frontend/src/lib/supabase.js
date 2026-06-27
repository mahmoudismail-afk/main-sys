import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://mmumcejifxfszjzjzjjl.supabase.co';
export const supabaseKey = 'sb_publishable_SGj22_Xqc1PXVVTtUlrcCg_gVwG1var';

export const supabase = createClient(supabaseUrl, supabaseKey);

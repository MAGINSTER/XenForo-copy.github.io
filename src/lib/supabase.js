import { createClient } from '@supabase/supabase-js';

// Supabase publishable keys are designed for public browser clients.
// Database access is protected by Row Level Security policies.
const url = 'https://sssgikogrytcnkpiacxc.supabase.co';
const publishableKey = 'sb_publishable_C40UsyXKl4cRBcaKYVG5Uw_OambffIB';

export const isSupabaseConfigured = true;
export const supabase = createClient(url, publishableKey);

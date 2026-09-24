import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure environment variables from .env are loaded
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceRoleKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co'
);

if (!isSupabaseConfigured) {
  console.warn(
    '[WARN] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in backend/.env.\n' +
    '       Database and JWT authentication will require valid credentials.'
  );
}

// Fallback to placeholder if missing so server won't crash prematurely before credentials are added
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseServiceRoleKey : 'placeholder-service-role-key';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;

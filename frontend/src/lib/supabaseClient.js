import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('YOUR_PROJECT')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[CONFIG] Supabase credentials not fully configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.'
  );
}

// Fallback dummy URL and key for initial client instantiation so Vite bundle won't crash
const validUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const validKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/+$/, '');

/**
 * Browser Supabase client - anon key only, session safely stored in localStorage.
 */
export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

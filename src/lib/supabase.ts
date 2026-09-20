import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until real credentials are in .env.local — the app shows a setup screen instead of crashing. */
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'))

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'not-configured', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // completes the email-verification link
  },
})

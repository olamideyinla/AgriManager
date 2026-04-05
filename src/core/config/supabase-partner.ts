import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Separate Supabase client for partner authentication.
 * Uses a different storageKey so partner and farmer sessions never collide.
 */
export const partnerSupabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storageKey: 'agri-partner-auth',
    autoRefreshToken: true,
    persistSession: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

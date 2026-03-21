import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
// New dashboard: "Publishable key". Legacy: "anon" JWT — either works with createClient().
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null


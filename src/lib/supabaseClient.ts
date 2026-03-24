import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
// New dashboard: "Publishable key". Legacy: "anon" JWT — either works with createClient().
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

/** When set before sign-in, session is stored in sessionStorage (tab-scoped) instead of localStorage. */
const AUTH_PERSIST_CHOICE_KEY = 'fishin-auth-use-session-tab'

export function setNextAuthPersistence(rememberMe: boolean) {
  try {
    if (rememberMe) sessionStorage.removeItem(AUTH_PERSIST_CHOICE_KEY)
    else sessionStorage.setItem(AUTH_PERSIST_CHOICE_KEY, '1')
  } catch {
    // ignore
  }
}

export function clearAuthPersistenceChoice() {
  try {
    sessionStorage.removeItem(AUTH_PERSIST_CHOICE_KEY)
  } catch {
    // ignore
  }
}

function preferSessionTabStorage(): boolean {
  try {
    return sessionStorage.getItem(AUTH_PERSIST_CHOICE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Routes Supabase auth tokens to localStorage (remember me) or sessionStorage (this browser tab only).
 * Choice is read on each get/set so it can be set immediately before signInWithPassword.
 */
const crmAuthStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(key) {
    if (preferSessionTabStorage()) return sessionStorage.getItem(key)
    return localStorage.getItem(key)
  },
  setItem(key, value) {
    if (preferSessionTabStorage()) {
      sessionStorage.setItem(key, value)
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    } else {
      localStorage.setItem(key, value)
      try {
        sessionStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
          storage: crmAuthStorage as Storage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null


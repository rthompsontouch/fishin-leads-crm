import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode
}) {
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub: (() => void) | undefined

    async function boot() {
      if (!supabase) {
        setSession(null)
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(nextSession)
        },
      )

      unsub = () => authListener.subscription.unsubscribe()
    }

    void boot()

    return () => {
      unsub?.()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!supabase) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="max-w-lg text-left">
          <h1 className="text-xl font-semibold mb-2">Supabase not configured</h1>
          <p className="text-sm opacity-80">
            Create a <code>.env</code> file with <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (Publishable key — not the Secret key).
          </p>
          <p className="text-sm opacity-80 mt-3">
            Then restart the dev server.
          </p>
          <div className="mt-4">
            <Navigate to="/login" replace state={{ from: location.pathname }} />
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return <>{children}</>
}


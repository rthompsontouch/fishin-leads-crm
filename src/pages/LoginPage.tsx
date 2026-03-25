import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { setNextAuthPersistence, supabase } from '../lib/supabaseClient'
import { getLoginBrandLogoCandidates } from '../lib/loginBrandLogo'
import ForgotPasswordDialog from '../features/auth/components/ForgotPasswordDialog'

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

/** Marketing links: `/login?email=user%40example.com` — browser usually decodes once; normalize safely. */
function emailFromQueryRaw(raw: string | null): string {
  if (raw == null) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const redirectTo =
    (location.state as { from?: string } | undefined)?.from ?? '/dashboard'
  const passwordResetOk = searchParams.get('reset') === 'success'

  const [formError, setFormError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [logoCandidateIndex, setLogoCandidateIndex] = useState(0)
  const [authBootstrapDone, setAuthBootstrapDone] = useState(!supabase)

  const emailQueryRaw = searchParams.get('email')
  const emailFromMarketing = useMemo(
    () => emailFromQueryRaw(emailQueryRaw),
    [emailQueryRaw],
  )

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailFromMarketing, password: '' },
    mode: 'onSubmit',
  })

  const lastFocusedPasswordForEmailRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authBootstrapDone) return
    if (!emailFromMarketing) return
    form.setValue('email', emailFromMarketing, { shouldValidate: false, shouldDirty: false })
  }, [authBootstrapDone, emailFromMarketing, form])

  useEffect(() => {
    if (!authBootstrapDone) return
    if (!emailFromMarketing.trim()) return
    if (lastFocusedPasswordForEmailRef.current === emailFromMarketing) return
    lastFocusedPasswordForEmailRef.current = emailFromMarketing
    const t = window.setTimeout(() => {
      void form.setFocus('password', { shouldSelect: false })
    }, 0)
    return () => window.clearTimeout(t)
  }, [authBootstrapDone, emailFromMarketing, form])

  const emailValue = form.watch('email')
  const [debouncedEmail, setDebouncedEmail] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedEmail(emailValue.trim()), 450)
    return () => window.clearTimeout(t)
  }, [emailValue])

  const logoCandidates = useMemo(
    () => getLoginBrandLogoCandidates(debouncedEmail),
    [debouncedEmail],
  )

  useEffect(() => {
    setLogoCandidateIndex(0)
  }, [debouncedEmail])

  const supabaseMissing = useMemo(() => !supabase, [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) {
        const to = redirectTo.startsWith('/') ? redirectTo : '/dashboard'
        navigate(to, { replace: true })
        return
      }
      setAuthBootstrapDone(true)
    })
    return () => {
      cancelled = true
    }
  }, [supabase, navigate, redirectTo])

  const activeLogoSrc =
    logoCandidates.length > 0 && logoCandidateIndex < logoCandidates.length
      ? logoCandidates[logoCandidateIndex]
      : null

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)

    if (!supabase) {
      setFormError(
        'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.',
      )
      return
    }

    setNextAuthPersistence(rememberMe)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setFormError(error.message)
      return
    }

    navigate(redirectTo, { replace: true })
  }

  if (!authBootstrapDone && supabase) {
    return (
      <div
        className="min-h-dvh grid place-items-center p-6"
        style={{
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
        }}
      >
        <div className="text-sm opacity-80">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-dvh grid place-items-center p-6"
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-foreground)',
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-sm"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {activeLogoSrc ? (
          <div className="flex justify-center mb-5 min-h-[3.5rem]">
            <img
              src={activeLogoSrc}
              alt=""
              className="max-h-14 max-w-[200px] w-auto object-contain"
              onError={() => setLogoCandidateIndex((i) => i + 1)}
            />
          </div>
        ) : null}

        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm opacity-80 mt-1">Welcome back to your CRM.</p>
        </div>

        {passwordResetOk ? (
          <div
            className="rounded-md border p-3 mb-4 text-sm"
            style={{
              borderColor: 'var(--color-success)',
              background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
            }}
          >
            Password updated. Sign in with your new password.
          </div>
        ) : null}

        {formError ? (
          <div
            className="rounded-md border p-3 mb-4 text-sm"
            style={{ borderColor: 'var(--color-danger)' }}
          >
            {formError}
          </div>
        ) : null}

        {supabaseMissing ? (
          <div
            className="rounded-md border p-3 mb-4 text-sm opacity-90"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Supabase is not configured yet. Create a <code>.env</code> file with{' '}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              autoComplete="email"
              className="rounded-md border px-3 py-2 outline-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-foreground)',
              }}
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <span className="text-xs text-[color:var(--color-danger)]">
                {form.formState.errors.email.message}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              autoComplete="current-password"
              className="rounded-md border px-3 py-2 outline-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-foreground)',
              }}
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <span className="text-xs text-[color:var(--color-danger)]">
                {form.formState.errors.password.message}
              </span>
            ) : null}
          </label>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none -mt-1">
            <input
              type="checkbox"
              className="size-4 rounded border shrink-0 cursor-pointer accent-[color:var(--color-primary)]"
              style={{ borderColor: 'var(--color-border)' }}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me on this device</span>
          </label>

          <div className="flex justify-end -mt-1">
            <button
              type="button"
              className="text-xs font-semibold text-[color:var(--color-primary)] hover:underline cursor-pointer bg-transparent border-0 p-0"
              onClick={() => setForgotOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <p className="text-xs opacity-70 mt-4 m-0">
          By continuing, you agree to your organization’s internal policies.
        </p>
      </div>

      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={emailValue.trim()}
      />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const redirectTo =
    (location.state as { from?: string } | undefined)?.from ?? '/dashboard'
  const passwordResetOk = searchParams.get('reset') === 'success'

  const [formError, setFormError] = useState<string | null>(null)

  const emailFromSignup = searchParams.get('email') ?? ''

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailFromSignup, password: '' },
    mode: 'onSubmit',
  })

  const supabaseMissing = useMemo(() => !supabase, [])

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)

    if (!supabase) {
      setFormError(
        'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.',
      )
      return
    }

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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm opacity-80 mt-1">
            Welcome back to your CRM.
          </p>
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
            <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              className="rounded-md border px-3 py-2 outline-none"
              style={{ borderColor: 'var(--color-border)' }}
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
              style={{ borderColor: 'var(--color-border)' }}
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <span className="text-xs text-[color:var(--color-danger)]">
                {form.formState.errors.password.message}
              </span>
            ) : null}
          </label>

          <div className="flex justify-end -mt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <div className="text-xs opacity-70 mt-4">
          By continuing, you agree to your organization’s internal policies.
        </div>
      </div>
    </div>
  )
}


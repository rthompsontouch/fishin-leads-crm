import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'
import { getPasswordRecoveryRedirectUrl } from '../../../lib/authSiteUrl'

const schema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
})

type Values = z.infer<typeof schema>

type Props = {
  initialEmail?: string
  /** When true, omit the standalone “back to sign in” footer (parent provides navigation). */
  hideFooterLink?: boolean
  /** When true, omit the H2 + intro (e.g. dialog already has a title). */
  omitHeading?: boolean
  onRequestClose?: () => void
}

export default function ForgotPasswordPanel({
  initialEmail = '',
  hideFooterLink,
  omitHeading,
  onRequestClose,
}: Props) {
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail },
    mode: 'onSubmit',
  })

  const supabaseMissing = useMemo(() => !supabase, [])

  async function onSubmit(values: Values) {
    setFormError(null)
    if (!supabase) {
      setFormError('Supabase is not configured.')
      return
    }

    const redirectTo = getPasswordRecoveryRedirectUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
      redirectTo,
    })

    if (error) {
      setFormError(error.message)
      return
    }

    setDone(true)
  }

  return (
    <div className="text-left">
      {omitHeading ? null : (
        <div className="mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Forgot password
          </h2>
          <p className="text-sm opacity-80 mt-1" style={{ color: 'var(--color-foreground)' }}>
            Enter your account email and we&apos;ll send a link to set a new password.
          </p>
        </div>
      )}

      {formError ? (
        <div
          className="rounded-md border p-3 mb-4 text-sm"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-foreground)' }}
        >
          {formError}
        </div>
      ) : null}

      {supabaseMissing ? (
        <div
          className="rounded-md border p-3 mb-4 text-sm opacity-90"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to your <code>.env</code> file.
        </div>
      ) : null}

      {done ? (
        <div className="space-y-4">
          <div
            className="rounded-md border p-3 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface-1)',
              color: 'var(--color-foreground)',
            }}
          >
            If an account exists for that email, we sent a reset link. Check your inbox (and spam).
          </div>
          {hideFooterLink ? (
            <button
              type="button"
              className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline cursor-pointer bg-transparent border-0 p-0"
              onClick={() => onRequestClose?.()}
            >
              Close
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-block text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              ← Back to sign in
            </Link>
          )}
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--color-foreground)' }}>
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

          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      {!done && !hideFooterLink ? (
        <div className="mt-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : null}
    </div>
  )
}

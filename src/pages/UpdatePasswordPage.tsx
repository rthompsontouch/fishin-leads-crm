import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { strongNewPasswordSchema } from '../lib/passwordStrength'
import NewPasswordPairFields, { type NewPasswordPair } from '../components/NewPasswordPairFields'
import { formatErrorForUser, useAppMessages } from '../context/AppMessagesContext'

const recoverySchema = z
  .object({
    new_password: strongNewPasswordSchema,
    confirm_password: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

type Values = z.infer<typeof recoverySchema>

type BootState = 'loading' | 'ready' | 'no_session' | 'no_supabase'

export default function UpdatePasswordPage() {
  const navigate = useNavigate()
  const { toastError } = useAppMessages()
  const [boot, setBoot] = useState<BootState>('loading')

  const form = useForm<NewPasswordPair>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { new_password: '', confirm_password: '' },
    mode: 'onSubmit',
  })

  const supabaseMissing = useMemo(() => !supabase, [])

  useEffect(() => {
    if (supabaseMissing) {
      setBoot('no_supabase')
      return
    }
    const client = supabase!

    let cancelled = false

    function considerSession() {
      void client.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (session) {
          setBoot('ready')
        }
      })
    }

    considerSession()

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        setBoot('ready')
        return
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) setBoot('ready')
      }
    })

    const t = window.setTimeout(() => {
      if (cancelled) return
      void client.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        setBoot((prev) => {
          if (prev === 'ready') return prev
          return session ? 'ready' : 'no_session'
        })
      })
    }, 2500)

    return () => {
      cancelled = true
      window.clearTimeout(t)
      sub.subscription.unsubscribe()
    }
  }, [supabaseMissing])

  async function onSubmit(values: Values) {
    if (!supabase) return

    const { error } = await supabase.auth.updateUser({
      password: values.new_password,
    })

    if (error) {
      toastError(formatErrorForUser(error))
      return
    }

    await supabase.auth.signOut()
    navigate('/login?reset=success', { replace: true })
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
          <h1 className="text-2xl font-semibold">Set new password</h1>
          <p className="text-sm opacity-80 mt-1">Choose a new password for your account.</p>
        </div>

        {boot === 'loading' ? (
          <div className="text-sm opacity-80 py-4">Checking your reset link…</div>
        ) : null}

        {boot === 'no_supabase' ? (
          <div className="text-sm opacity-90">
            Supabase is not configured. Add your environment variables and restart the app.
          </div>
        ) : null}

        {boot === 'no_session' ? (
          <div className="space-y-4">
            <div
              className="rounded-md border p-3 text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </div>
            <Link
              to="/forgot-password"
              className="inline-block text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              Forgot password
            </Link>
            <span className="text-sm opacity-60"> · </span>
            <Link
              to="/login"
              className="inline-block text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        ) : null}

        {boot === 'ready' ? (
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <NewPasswordPairFields
              register={form.register}
              watch={form.watch}
              setValue={form.setValue}
              errors={form.formState.errors}
              trigger={form.trigger}
              getValues={form.getValues}
              disabled={form.formState.isSubmitting}
            />

            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Saving…' : 'Update password'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  changeMyEmail,
  changeMyPassword,
  clearMyCompanyLogo,
  getCompanyLogoPublicUrl,
  getMyProfile,
  updateMyProfile,
  uploadMyCompanyLogo,
} from '../features/account/api/accountApi'
import { supabase } from '../lib/supabaseClient'
import { strongNewPasswordSchema } from '../lib/passwordStrength'
import PasswordChangeFields, { type PasswordChangeFormFields } from '../components/PasswordChangeFields'
import FormFieldError from '../components/FormFieldError'
import { formatErrorForUser, useAppMessages } from '../context/AppMessagesContext'
import { ensureWebPushSubscribed } from '../lib/webPushSubscription'
import { getHasMyPushSubscription } from '../features/notifications/api/notificationsApi'
import { LogOut } from 'lucide-react'

const settingsCardClass =
  'rounded-xl bg-white p-6 sm:p-7 shadow-sm ring-1 ring-black/5'
const settingsInsetClass =
  'rounded-lg border-2 bg-slate-50 p-4 sm:p-5'
const insetBorderStyle = { borderColor: 'hsl(215 22% 72%)' } as const
const fieldLabelStyle = { color: 'var(--crm-content-header-text)' } as const
const fieldInputClass =
  'rounded-md border-2 px-3 py-2 outline-none bg-white w-full min-w-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1'
const fieldInputStyle = {
  borderColor: 'hsl(215 22% 72%)',
  color: 'var(--crm-content-header-text)',
} as const

const emptyToNull = (v: string | null | undefined) => {
  if (v === null || v === undefined) return null
  const t = v.trim()
  return t ? t : null
}

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: strongNewPasswordSchema,
    confirm_password: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

export default function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { toastError, toastSuccess } = useAppMessages()
  const [logoBusy, setLogoBusy] = useState(false)
  const [pushUiError, setPushUiError] = useState<string | null>(null)
  const [pushTestBusy, setPushTestBusy] = useState(false)
  const [pushTestResult, setPushTestResult] = useState<string | null>(null)
  const [reminderDispatchBusy, setReminderDispatchBusy] = useState(false)
  const [reminderDispatchResult, setReminderDispatchResult] = useState<string | null>(null)
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

  useEffect(() => {
    if (location.pathname !== '/settings') return
    const id = location.hash.replace(/^#/, '')
    if (!id) return
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.pathname, location.hash])

  const {
    data: profile,
    isPending: isProfilePending,
    error: profileError,
  } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => getMyProfile(),
  })

  const currentEmail = useQuery({
    queryKey: ['my-auth-email'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not configured')
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session?.user.email ?? null
    },
    enabled: true,
  }).data

  const {
    data: hasPushSubscription,
    isPending: isPushSubscriptionPending,
  } = useQuery({
    queryKey: ['my-push-subscription'],
    queryFn: async () => {
      try {
        if (!vapidPublicKey) return false
        return await getHasMyPushSubscription()
      } catch {
        // Table/policies might not be migrated yet; fail open.
        return false
      }
    },
    enabled: Boolean(vapidPublicKey),
  })

  const accountSchema = useMemo(() => {
    return z.object({
      company_name: z.string().min(1, 'Company name is required.'),

      first_name: z.string().optional().or(z.literal('')),
      last_name: z.string().optional().or(z.literal('')),
      phone: z.string().optional().or(z.literal('')),
      industry: z.string().optional().or(z.literal('')),
      company_size: z.string().optional().or(z.literal('')),
      website: z.string().optional().or(z.literal('')),
    })
  }, [])

  type AccountValues = z.infer<typeof accountSchema>

  const accountForm = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      company_name: profile?.company_name ?? '',
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      industry: profile?.industry ?? '',
      company_size: profile?.company_size ?? '',
      website: profile?.website ?? '',
    },
  })

  useEffect(() => {
    if (!profile) return
    accountForm.reset({
      company_name: profile.company_name ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone: profile.phone ?? '',
      industry: profile.industry ?? '',
      company_size: profile.company_size ?? '',
      website: profile.website ?? '',
    })
  }, [accountForm, profile])

  const securitySchema = useMemo(() => {
    return z.object({
      new_email: z.string().email('Enter a valid email address.'),
      current_password_for_email: z.string().min(1, 'Current password is required.'),
    })
  }, [])

  type EmailValues = z.infer<typeof securitySchema>

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      new_email: currentEmail ?? '',
      current_password_for_email: '',
    },
  })

  useEffect(() => {
    if (!currentEmail) return
    emailForm.setValue('new_email', currentEmail)
  }, [currentEmail, emailForm])

  const passwordForm = useForm<PasswordChangeFormFields>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  async function handleSaveAccount(values: AccountValues) {
    const payload = {
      company_name: values.company_name,
      first_name: emptyToNull(values.first_name),
      last_name: emptyToNull(values.last_name),
      phone: emptyToNull(values.phone),
      industry: emptyToNull(values.industry),
      company_size: emptyToNull(values.company_size),
      website: emptyToNull(values.website),
    }

    await updateMyProfile(payload)
    await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    toastSuccess('Account details saved.')
  }

  async function handleChangeEmail(values: EmailValues) {
    if (!currentEmail) throw new Error('Current email not available.')

    await changeMyEmail(values.current_password_for_email, values.new_email)
    await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    await queryClient.invalidateQueries({ queryKey: ['my-auth-email'] })
    emailForm.reset({
      new_email: values.new_email,
      current_password_for_email: '',
    })
    toastSuccess('Email change requested. If confirmation is required, check your inbox.')
  }

  async function handleChangePassword(values: PasswordChangeFormFields) {
    await changeMyPassword(values.current_password, values.new_password)
    passwordForm.reset({
      current_password: '',
      new_password: '',
      confirm_password: '',
    })
    toastSuccess('Password updated.')
  }

  const companyLogoPreview = useMemo(
    () => getCompanyLogoPublicUrl(profile?.company_logo_path),
    [profile?.company_logo_path],
  )

  async function handleLogoFileChange(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setLogoBusy(true)
    try {
      await uploadMyCompanyLogo(file)
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toastSuccess('Company logo updated.')
    } catch (e) {
      toastError(formatErrorForUser(e))
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleRemoveLogo() {
    setLogoBusy(true)
    try {
      await clearMyCompanyLogo()
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toastSuccess('Company logo removed.')
    } catch (e) {
      toastError(formatErrorForUser(e))
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleSignOut() {
    if (!supabase) throw new Error('Supabase client not configured')
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const sectionAnchorClass =
    'font-semibold text-[color:var(--color-primary)] underline-offset-2 hover:underline'

  return (
    <div className="crm-light-surface flex flex-col gap-6 max-md:pt-2 max-w-3xl w-full">
      <div className="crm-page-header">
        <h1 className="crm-page-header-title">Settings</h1>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold border-2 cursor-pointer transition-colors duration-150 bg-white hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger)] focus-visible:ring-offset-2"
          style={{
            color: 'var(--color-danger)',
            borderColor: 'color-mix(in srgb, var(--color-danger) 50%, hsl(215 22% 82%))',
          }}
        >
          <LogOut size={18} className="shrink-0" strokeWidth={2.25} aria-hidden />
          Sign out
        </button>
      </div>

      {profileError ? (
        <div
          className="rounded-xl border-2 px-4 py-3 text-sm bg-red-50/90"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)',
            color: 'var(--color-danger)',
          }}
        >
          Failed to load profile: {String((profileError as Error).message)}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        <div id="settings-account" className={`${settingsCardClass} scroll-mt-6`}>
          <div
            className="text-lg font-semibold mb-1"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Account details
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Company profile and branding. For email, password, and notifications, see{' '}
            <a href="#settings-security" className={sectionAnchorClass}>
              Security
            </a>{' '}
            below.
          </p>

          <div className={`${settingsInsetClass} mb-6`} style={insetBorderStyle}>
            <div
              className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2"
            >
              Company logo
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Shown in the sidebar next to your company name. PNG, JPG, WebP, SVG, or GIF — max ~2MB
              recommended.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-lg border-2 overflow-hidden shrink-0 bg-white"
                style={insetBorderStyle}
              >
                {companyLogoPreview ? (
                  <img
                    src={companyLogoPreview}
                    alt="Company logo preview"
                    className="max-h-full max-w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 text-center px-2 leading-tight">
                    No logo
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <label className="text-sm font-medium" style={fieldLabelStyle}>
                  <span className="sr-only">Upload company logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg"
                    disabled={logoBusy || isProfilePending}
                    className="block w-full max-w-sm text-xs file:mr-2 file:rounded-md file:border-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:border-[hsl(215_22%_72%)] file:bg-white file:text-slate-800 hover:file:bg-slate-50"
                    onChange={(e) => void handleLogoFileChange(e.target.files)}
                  />
                </label>
                {profile?.company_logo_path ? (
                  <button
                    type="button"
                    disabled={logoBusy}
                    className="self-start rounded-md border-2 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: 'var(--color-danger)',
                      borderColor: 'hsl(215 22% 72%)',
                    }}
                    onClick={() => void handleRemoveLogo()}
                  >
                    Remove logo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {isProfilePending ? (
            <div className="text-sm text-slate-600">Loading profile…</div>
          ) : (
            <form
              className="grid grid-cols-1 gap-3 pt-2 border-t border-[hsl(215_20%_88%)]"
              onSubmit={accountForm.handleSubmit(async (v) => {
                try {
                  await handleSaveAccount(v)
                } catch (e) {
                  toastError(formatErrorForUser(e))
                }
              })}
            >
              <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                Company name
                <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('company_name')} />
                <FormFieldError message={accountForm.formState.errors.company_name?.message} />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                Tier
                <input
                  disabled
                  value={profile?.tier ?? 'Freemium'}
                  className={`${fieldInputClass} opacity-85 disabled:cursor-not-allowed bg-slate-50`}
                  style={fieldInputStyle}
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                  First name
                  <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('first_name')} />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                  Last name
                  <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('last_name')} />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                Phone
                <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('phone')} />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                Industry
                <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('industry')} />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                Company size
                <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('company_size')} />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
                Website
                <input className={fieldInputClass} style={fieldInputStyle} {...accountForm.register('website')} />
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="rounded-md px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={accountForm.formState.isSubmitting}
                >
                  {accountForm.formState.isSubmitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div id="settings-security" className={`${settingsCardClass} scroll-mt-6`}>
          <div
            className="text-lg font-semibold mb-1"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Security
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Email, password, and notifications. For company profile and branding, see{' '}
            <a href="#settings-account" className={sectionAnchorClass}>
              Account details
            </a>{' '}
            above.
          </p>

          <div
            className="rounded-lg border-2 px-4 py-3 mb-6 bg-slate-50"
            style={insetBorderStyle}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Signed in as
            </div>
            <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--crm-content-header-text)' }}>
              {currentEmail ?? '—'}
            </div>
          </div>

          <div className={`${settingsInsetClass} mb-6`} style={insetBorderStyle}>
            <div className="text-sm font-semibold" style={{ color: 'var(--crm-content-header-text)' }}>
              Notifications (Web Push)
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {vapidPublicKey
                ? hasPushSubscription
                  ? 'Enabled on at least one device. Enable on this device too so it is registered here.'
                  : 'Enable to receive push notifications for new leads.'
                : 'Set VITE_VAPID_PUBLIC_KEY in your env to enable web push.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isPushSubscriptionPending || !vapidPublicKey}
                onClick={async () => {
                  try {
                    setPushUiError(null)
                    setPushTestResult(null)
                    await ensureWebPushSubscribed()
                    toastSuccess('Notifications enabled.')
                    await queryClient.invalidateQueries({ queryKey: ['my-push-subscription'] })
                  } catch (e) {
                    const msg = formatErrorForUser(e)
                    setPushUiError(msg)
                    toastError(msg)
                  }
                }}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPushSubscriptionPending ? 'Enabling…' : 'Enable on this device'}
              </button>

              <button
                type="button"
                disabled={pushTestBusy || !vapidPublicKey || !hasPushSubscription}
                onClick={async () => {
                  if (!supabase) throw new Error('Supabase client not configured')
                  if (!vapidPublicKey) throw new Error('Missing VITE_VAPID_PUBLIC_KEY')

                  setPushTestBusy(true)
                  setPushTestResult(null)
                  try {
                    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
                    if (sessionErr) throw sessionErr
                    const userId = sessionData?.session?.user?.id
                    if (!userId) throw new Error('Not authenticated for test push.')

                    const { data: latestLead, error: latestLeadErr } = await supabase
                      .from('leads')
                      .select('id')
                      .eq('owner_id', userId)
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .maybeSingle()
                    if (latestLeadErr) throw latestLeadErr
                    if (!latestLead?.id) {
                      throw new Error('Create at least one lead first, then retry test push.')
                    }

                    const { error: enqueueErr } = await supabase.from('lead_push_events').insert({
                      owner_id: userId,
                      lead_id: latestLead.id,
                    } as any)
                    if (enqueueErr) throw enqueueErr

                    setPushTestResult('Test push event queued. If push is working, you should see a popup shortly.')
                    toastSuccess('Test push queued. You should see a popup shortly.')
                  } catch (e) {
                    const msg = formatErrorForUser(e)
                    setPushTestResult(`Test push failed: ${msg}`)
                    toastError(msg)
                  } finally {
                    setPushTestBusy(false)
                  }
                }}
                className="rounded-md px-4 py-2 text-sm font-semibold border-2 cursor-pointer transition-colors duration-150 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--crm-content-header-text)',
                  borderColor: 'hsl(215 22% 72%)',
                }}
              >
                {pushTestBusy ? 'Sending…' : 'Send test notification'}
              </button>
            </div>

            {pushUiError ? (
              <div
                className="mt-4 text-sm rounded-lg border-2 p-3 bg-red-50/90 whitespace-pre-wrap"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
                  color: 'var(--color-danger)',
                }}
              >
                {pushUiError}
              </div>
            ) : null}

            {pushTestResult ? (
              <div
                className="mt-4 text-sm rounded-lg border-2 p-3 bg-white whitespace-pre-wrap text-slate-800"
                style={insetBorderStyle}
              >
                {pushTestResult}
              </div>
            ) : null}
          </div>

          <div className={`${settingsInsetClass} mb-8`} style={insetBorderStyle}>
            <div className="text-sm font-semibold" style={{ color: 'var(--crm-content-header-text)' }}>
              Service reminder dispatch
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Sends push notifications for due scheduled jobs where the reminder time has passed.
            </p>
            <div className="mt-4">
              <button
                type="button"
                disabled={reminderDispatchBusy || !vapidPublicKey}
                onClick={async () => {
                  if (!supabase) throw new Error('Supabase client not configured')
                  setReminderDispatchBusy(true)
                  setReminderDispatchResult(null)
                  try {
                    const { data, error } = await supabase.functions.invoke('job-reminder-webpush', {
                      body: { limit: 200, dry_run: false },
                    })
                    if (error) throw error
                    setReminderDispatchResult(`Reminder dispatch completed: ${JSON.stringify(data)}`)
                    toastSuccess('Reminder dispatch executed.')
                  } catch (e) {
                    const msg = formatErrorForUser(e)
                    setReminderDispatchResult(`Reminder dispatch failed: ${msg}`)
                    toastError(msg)
                  } finally {
                    setReminderDispatchBusy(false)
                  }
                }}
                className="rounded-md px-4 py-2 text-sm font-semibold border-2 cursor-pointer transition-colors duration-150 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--crm-content-header-text)',
                  borderColor: 'hsl(215 22% 72%)',
                }}
              >
                {reminderDispatchBusy ? 'Dispatching…' : 'Run reminder dispatch now'}
              </button>
            </div>
            {reminderDispatchResult ? (
              <div
                className="mt-4 text-sm rounded-lg border-2 p-3 bg-white whitespace-pre-wrap text-slate-800 font-mono text-xs"
                style={insetBorderStyle}
              >
                {reminderDispatchResult}
              </div>
            ) : null}
          </div>

          <form
            className="grid grid-cols-1 gap-3 mb-10 pt-2 border-t border-[hsl(215_20%_88%)]"
            onSubmit={emailForm.handleSubmit(async (v) => {
              try {
                await handleChangeEmail(v)
              } catch (e) {
                toastError(formatErrorForUser(e))
              }
            })}
          >
            <div className="text-base font-semibold" style={{ color: 'var(--crm-content-header-text)' }}>
              Change email
            </div>

            <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
              New email
              <input className={fieldInputClass} style={fieldInputStyle} {...emailForm.register('new_email')} />
              <FormFieldError message={emailForm.formState.errors.new_email?.message} />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium" style={fieldLabelStyle}>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                className={fieldInputClass}
                style={fieldInputStyle}
                {...emailForm.register('current_password_for_email')}
              />
              <FormFieldError message={emailForm.formState.errors.current_password_for_email?.message} />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting ? 'Updating...' : 'Update email'}
              </button>
            </div>
          </form>

          <form
            className="grid grid-cols-1 gap-3 pt-2 border-t border-[hsl(215_20%_88%)]"
            onSubmit={passwordForm.handleSubmit(async (v) => {
              try {
                await handleChangePassword(v)
              } catch (e) {
                toastError(formatErrorForUser(e))
              }
            })}
          >
            <div className="text-base font-semibold" style={{ color: 'var(--crm-content-header-text)' }}>
              Change password
            </div>

            <PasswordChangeFields
              register={passwordForm.register}
              watch={passwordForm.watch}
              setValue={passwordForm.setValue}
              errors={passwordForm.formState.errors}
              trigger={passwordForm.trigger}
              getValues={passwordForm.getValues}
              disabled={passwordForm.formState.isSubmitting}
            />

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="rounded-md px-5 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { ProfileRow } from '../features/account/api/accountApi'
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

const tierValues = ['Freemium', 'Basic', 'Advanced', 'Enterprise'] as const
type TierValue = (typeof tierValues)[number]

const emptyToNull = (v: string | null | undefined) => {
  if (v === null || v === undefined) return null
  const t = v.trim()
  return t ? t : null
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)

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

  const accountSchema = useMemo(() => {
    return z.object({
      company_name: z.string().min(1, 'Company name is required.'),
      tier: z.enum(tierValues),

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
      tier: (profile?.tier ?? 'Freemium') as TierValue,
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
      tier: (profile.tier ?? 'Freemium') as TierValue,
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

  const passwordSchema = useMemo(() => {
    return z.object({
      current_password: z.string().min(1, 'Current password is required.'),
      new_password: z.string().min(6, 'New password must be at least 6 characters.'),
      confirm_password: z.string().min(6, 'Confirm password is required.'),
    })
  }, [])

  const passwordResolver = useMemo(() => {
    return zodResolver(
      passwordSchema.refine((v) => v.new_password === v.confirm_password, {
        message: 'Passwords do not match.',
        path: ['confirm_password'],
      }),
    )
  }, [passwordSchema])

  type PasswordValues = z.infer<typeof passwordSchema>

  const passwordForm = useForm<PasswordValues>({
    resolver: passwordResolver,
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  async function handleSaveAccount(values: AccountValues) {
    setActionError(null)
    setActionSuccess(null)

    const payload = {
      company_name: values.company_name,
      tier: values.tier as ProfileRow['tier'],
      first_name: emptyToNull(values.first_name),
      last_name: emptyToNull(values.last_name),
      phone: emptyToNull(values.phone),
      industry: emptyToNull(values.industry),
      company_size: emptyToNull(values.company_size),
      website: emptyToNull(values.website),
    }

    await updateMyProfile(payload)
    await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    setActionSuccess('Account details saved.')
  }

  async function handleChangeEmail(values: EmailValues) {
    setActionError(null)
    setActionSuccess(null)

    if (!currentEmail) throw new Error('Current email not available.')

    await changeMyEmail(values.current_password_for_email, values.new_email)
    await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    await queryClient.invalidateQueries({ queryKey: ['my-auth-email'] })
    setActionSuccess('Email change requested. If confirmation is required, check your inbox.')
  }

  async function handleChangePassword(values: PasswordValues) {
    setActionError(null)
    setActionSuccess(null)
    await changeMyPassword(values.current_password, values.new_password)
    setActionSuccess('Password updated.')
  }

  const companyLogoPreview = useMemo(
    () => getCompanyLogoPublicUrl(profile?.company_logo_path),
    [profile?.company_logo_path],
  )

  async function handleLogoFileChange(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setActionError(null)
    setActionSuccess(null)
    setLogoBusy(true)
    try {
      await uploadMyCompanyLogo(file)
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      setActionSuccess('Company logo updated.')
    } catch (e) {
      setActionError(String((e as Error).message ?? e))
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleRemoveLogo() {
    setActionError(null)
    setActionSuccess(null)
    setLogoBusy(true)
    try {
      await clearMyCompanyLogo()
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      setActionSuccess('Company logo removed.')
    } catch (e) {
      setActionError(String((e as Error).message ?? e))
    } finally {
      setLogoBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm opacity-80 mt-1">
          Update your account and login details.
        </p>
      </div>

      {profileError ? (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-danger)' }}>
          Failed to load profile: {String((profileError as Error).message)}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-danger)' }}>
          {actionError}
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-success)' }}>
          {actionSuccess}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-semibold mb-3">Account details</div>

          <div
            className="mb-5 rounded-lg border p-4"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">
              Company logo
            </div>
            <p className="text-xs opacity-75 mb-3">
              Shown in the sidebar next to your company name. PNG, JPG, WebP, SVG, or GIF — max ~2MB
              recommended.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-lg border overflow-hidden shrink-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {companyLogoPreview ? (
                  <img
                    src={companyLogoPreview}
                    alt="Company logo preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] opacity-50 text-center px-1">No logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <label className="text-sm">
                  <span className="sr-only">Upload company logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg"
                    disabled={logoBusy || isProfilePending}
                    className="block w-full max-w-xs text-xs file:mr-2 file:rounded file:border file:px-2 file:py-1 file:text-xs"
                    onChange={(e) => void handleLogoFileChange(e.target.files)}
                  />
                </label>
                {profile?.company_logo_path ? (
                  <button
                    type="button"
                    disabled={logoBusy}
                    className="self-start rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent hover:bg-[color:var(--color-surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => void handleRemoveLogo()}
                  >
                    Remove logo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {isProfilePending ? (
            <div className="text-sm opacity-80">Loading...</div>
          ) : (
            <form
              className="grid grid-cols-1 gap-4"
              onSubmit={accountForm.handleSubmit(async (v) => {
                try {
                  await handleSaveAccount(v)
                } catch (e) {
                  setActionError(String((e as Error).message ?? e))
                }
              })}
            >
              <label className="flex flex-col gap-1 text-sm">
                Company name
                <input
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  {...accountForm.register('company_name')}
                />
                {accountForm.formState.errors.company_name ? (
                  <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                    {accountForm.formState.errors.company_name.message}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Tier
                <select
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  {...accountForm.register('tier')}
                >
                  {tierValues.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  First name
                  <input
                    className="rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)' }}
                    {...accountForm.register('first_name')}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Last name
                  <input
                    className="rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)' }}
                    {...accountForm.register('last_name')}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                Phone
                <input
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  {...accountForm.register('phone')}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Industry
                <input
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  {...accountForm.register('industry')}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Company size
                <input
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  {...accountForm.register('company_size')}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Website
                <input
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  {...accountForm.register('website')}
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={accountForm.formState.isSubmitting}
                >
                  {accountForm.formState.isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-semibold mb-3">Security</div>

          <div className="text-sm opacity-80 mb-4">
            Current email: <span style={{ fontWeight: 700 }}>{currentEmail ?? '—'}</span>
          </div>

          <form
            className="grid grid-cols-1 gap-4 mb-6"
            onSubmit={emailForm.handleSubmit(async (v) => {
              try {
                await handleChangeEmail(v)
              } catch (e) {
                setActionError(String((e as Error).message ?? e))
              }
            })}
          >
            <div className="text-sm font-semibold">Change email</div>

            <label className="flex flex-col gap-1 text-sm">
              New email
              <input
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)' }}
                {...emailForm.register('new_email')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Current password
              <input
                type="password"
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)' }}
                {...emailForm.register('current_password_for_email')}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting ? 'Updating...' : 'Update email'}
              </button>
            </div>
          </form>

          <form
            className="grid grid-cols-1 gap-4"
            onSubmit={passwordForm.handleSubmit(async (v) => {
              try {
                await handleChangePassword(v)
              } catch (e) {
                setActionError(String((e as Error).message ?? e))
              }
            })}
          >
            <div className="text-sm font-semibold">Change password</div>

            <label className="flex flex-col gap-1 text-sm">
              Current password
              <input
                type="password"
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)' }}
                {...passwordForm.register('current_password')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              New password
              <input
                type="password"
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)' }}
                {...passwordForm.register('new_password')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Confirm new password
              <input
                type="password"
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)' }}
                {...passwordForm.register('confirm_password')}
              />
            </label>

            {passwordForm.formState.errors.confirm_password ? (
              <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
                {passwordForm.formState.errors.confirm_password.message}
              </span>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
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


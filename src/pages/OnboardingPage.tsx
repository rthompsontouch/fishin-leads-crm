import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  completeOnboarding,
  getMyProfile,
  updateMyProfile,
} from '../features/account/api/accountApi'
import {
  createIntegration,
  getWebhookUrl,
  type CreateIntegrationInput,
} from '../features/integrations/api/integrationsApi'
import { createLead } from '../features/leads/api/leadsApi'
import IntegrationCreateForm from '../features/integrations/components/IntegrationCreateForm'
import ApiKeyRevealModal from '../features/integrations/components/ApiKeyRevealModal'
import FormFieldError from '../components/FormFieldError'
import { needsOnboarding } from '../lib/onboarding'
import { formatErrorForUser, useAppMessages } from '../context/AppMessagesContext'

const profileSchema = z.object({
  company_name: z.string().min(1, 'Company name is required.'),
  display_name: z.string().min(1, 'Display name is required.'),
})

type ProfileValues = z.infer<typeof profileSchema>

const STEPS = ['Welcome', 'Your profile', 'Lead capture', 'Sample lead'] as const

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toastError } = useAppMessages()

  const { data: profile, isPending } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => getMyProfile(),
  })

  const [step, setStep] = useState(0)
  const [createBusy, setCreateBusy] = useState(false)
  const [apiKeyModal, setApiKeyModal] = useState<{ apiKey: string } | null>(null)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { company_name: '', display_name: '' },
  })

  const webhookUrl = getWebhookUrl()

  useEffect(() => {
    if (!profile) return
    profileForm.reset({
      company_name: profile.company_name?.trim() ?? '',
      display_name: profile.display_name?.trim() ?? '',
    })
  }, [profile, profileForm])

  useEffect(() => {
    if (isPending) return
    if (!needsOnboarding(profile)) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, isPending, navigate])

  if (isPending) {
    return (
      <div className="min-h-dvh grid place-items-center" style={{ background: 'var(--color-background)' }}>
        <div className="text-sm opacity-80">Loading...</div>
      </div>
    )
  }

  if (!needsOnboarding(profile)) {
    return null
  }

  async function onProfileSubmit(values: ProfileValues) {
    await updateMyProfile({
      company_name: values.company_name.trim(),
      display_name: values.display_name.trim(),
      tier: profile?.tier ?? 'Freemium',
    })
    await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    setStep(2)
  }

  async function onIntegrationSubmit(values: CreateIntegrationInput) {
    setCreateBusy(true)
    try {
      const result = await createIntegration(values)
      setApiKeyModal({ apiKey: result.apiKey })
      await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    } catch (e) {
      toastError(formatErrorForUser(e))
    } finally {
      setCreateBusy(false)
    }
  }

  async function finishWithSampleLead() {
    try {
      await createLead({
        first_name: 'Jordan',
        last_name: 'Sample',
        company: 'Acme Plumbing Co.',
        industry: 'Home services',
        company_size: '11-50',
        website: 'https://example.com',
        email: 'jordan.sample@example.com',
        phone: '+1 555-0100',
        source: 'Onboarding',
        status: 'New',
      })
      await completeOnboarding()
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      navigate('/dashboard', { replace: true })
    } catch (e) {
      toastError(formatErrorForUser(e))
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center px-4 py-10"
      style={{ background: 'var(--color-background)', color: 'var(--color-foreground)' }}
    >
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="text-xs font-bold uppercase tracking-wider opacity-50">
            Setup · step {step + 1} / {STEPS.length}
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full flex-1 min-w-[2rem]"
                style={{
                  background:
                    i <= step
                      ? 'var(--color-primary)'
                      : 'color-mix(in srgb, var(--color-border) 80%, transparent)',
                }}
              />
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl border p-6 sm:p-8 shadow-sm"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          {step === 0 ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold">Welcome to Fishin Leads CRM</h1>
              <p className="text-sm opacity-80 leading-relaxed">
                Let&apos;s connect your workspace in a few quick steps: confirm your company profile, set up
                website lead capture, and add a sample lead so you can explore the pipeline.
              </p>
              <button
                type="button"
                className="w-full sm:w-auto rounded-md px-5 py-2.5 text-sm font-semibold text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)]"
                onClick={() => setStep(1)}
              >
                Get started
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold">{STEPS[1]}</h1>
              <p className="text-sm opacity-80">
                This appears in your account and sidebar. You can change it later in Settings.
              </p>
              <form
                className="grid gap-4"
                onSubmit={profileForm.handleSubmit((v) => void onProfileSubmit(v))}
              >
                <label className="flex flex-col gap-1 text-sm">
                  Company name
                  <input
                    className="rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                    {...profileForm.register('company_name')}
                  />
                  <FormFieldError message={profileForm.formState.errors.company_name?.message} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Display name
                  <input
                    className="rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                    placeholder="Your name or how you sign emails"
                    {...profileForm.register('display_name')}
                  />
                  <FormFieldError message={profileForm.formState.errors.display_name?.message} />
                </label>
                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-md px-4 py-2 text-sm font-semibold border border-[color:var(--color-border)]"
                    onClick={() => setStep(0)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={profileForm.formState.isSubmitting}
                    className="rounded-md px-4 py-2 text-sm font-semibold text-white bg-[color:var(--color-primary)] disabled:opacity-60"
                  >
                    {profileForm.formState.isSubmitting ? 'Saving…' : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold">{STEPS[2]}</h1>
              <p className="text-sm opacity-80">
                Create an integration to get an API key for your marketing site. You&apos;ll paste the key
                into your form as the <code className="text-xs">x-api-key</code> header.
              </p>
              {webhookUrl ? (
                <div
                  className="rounded-lg border p-3 text-xs"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                >
                  <div className="opacity-70 mb-1">Webhook URL (for your developer)</div>
                  <div className="font-mono break-all">{webhookUrl}</div>
                </div>
              ) : (
                <div className="text-xs opacity-70">
                  Set <code className="text-[11px]">VITE_SUPABASE_URL</code> (or optional{' '}
                  <code className="text-[11px]">VITE_WEBSITE_LEAD_CAPTURE_URL</code>) in your env to show the
                  webhook URL here.
                </div>
              )}

              <IntegrationCreateForm
                submitLabel={createBusy ? 'Creating…' : 'Create integration'}
                onSubmit={onIntegrationSubmit}
              />

              <button
                type="button"
                className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>

              {apiKeyModal ? (
                <div className="pt-2">
                  <p className="text-sm font-semibold mb-2">Key created — copy it before continuing</p>
                  <ApiKeyRevealModal
                    apiKey={apiKeyModal.apiKey}
                    webhookUrl={webhookUrl || ''}
                    onClose={() => {
                      setApiKeyModal(null)
                      setStep(3)
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold">{STEPS[3]}</h1>
              <p className="text-sm opacity-80">
                Add a demo lead to your pipeline so you can click through the CRM right away.
              </p>
              <button
                type="button"
                className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)]"
                onClick={() => void finishWithSampleLead()}
              >
                Add sample lead &amp; go to dashboard
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline"
                onClick={() => setStep(2)}
              >
                ← Back
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

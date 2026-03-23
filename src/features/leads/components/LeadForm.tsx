import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import ContactActionButtons from '../../../components/ContactActionButtons'
import type { CreateLeadInput } from '../api/leadsApi'

const leadStatusValues = [
  'New',
  'Contacted',
  'Quoted',
  'Won',
  'Lost',
] as const

type LeadStatus = (typeof leadStatusValues)[number]

const formSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company: z.string().optional(),
    industry: z.string().optional(),
    company_size: z.string().optional(),
    website: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    source: z.string().optional(),
    details: z.string().optional(),
    status: z.enum(leadStatusValues as unknown as [string, ...string[]]),
  })
  .refine(
    (v) => Boolean((v.first_name ?? '').trim() || (v.last_name ?? '').trim()),
    {
      message: 'Enter at least a first name or last name.',
      path: ['first_name'],
    },
  )

type FormValues = z.infer<typeof formSchema>

export type LeadFormValues = {
  first_name?: string
  last_name?: string
  company?: string | null
  industry?: string | null
  company_size?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  details?: string | null
  status: CreateLeadInput['status'] | LeadStatus
}

export default function LeadForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<LeadFormValues>
  submitLabel: string
  onSubmit: (values: LeadFormValues) => Promise<void> | void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialValues?.first_name ?? '',
      last_name: initialValues?.last_name ?? '',
      company: initialValues?.company ?? '',
      industry: initialValues?.industry ?? '',
      company_size: initialValues?.company_size ?? '',
      website: initialValues?.website ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      source: initialValues?.source ?? '',
      details: initialValues?.details ?? '',
      status: (initialValues?.status ?? 'New') as any,
    },
  })

  const emailVal = form.watch('email')
  const phoneVal = form.watch('phone')

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      first_name: values.first_name?.trim() ? values.first_name.trim() : undefined,
      last_name: values.last_name?.trim() ? values.last_name.trim() : undefined,
      company: values.company?.trim() ? values.company.trim() : null,
      industry: values.industry?.trim() ? values.industry.trim() : null,
      company_size: values.company_size?.trim() ? values.company_size.trim() : null,
      website: values.website?.trim() ? values.website.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      phone: values.phone?.trim() ? values.phone.trim() : null,
      source: values.source?.trim() ? values.source.trim() : null,
      details: values.details?.trim() ? values.details.trim() : null,
      status: values.status as any,
    })
  }

  const firstError = form.formState.errors.first_name?.message

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <label className="flex flex-col gap-1 text-sm">
        First name
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('first_name')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Last name
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('last_name')}
        />
      </label>

      <div className="md:col-span-2">
        {firstError ? (
          <div className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {firstError}
          </div>
        ) : null}
      </div>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Company
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('company')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Industry
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('industry')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Company size
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('company_size')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Website
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('website')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('email')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Phone
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('phone')}
        />
      </label>

      <div className="md:col-span-2 flex flex-wrap items-center gap-2 min-h-[2rem]">
        <span className="text-xs opacity-70">Quick actions:</span>
        <ContactActionButtons phone={phoneVal} email={emailVal} />
      </div>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Source
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('source')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Message / details (optional)
        <textarea
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)', minHeight: 92 }}
          {...form.register('details')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('status')}
        >
          {leadStatusValues.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end justify-end md:col-span-1">
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}


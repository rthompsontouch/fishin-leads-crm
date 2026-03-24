import { zodResolver } from '@hookform/resolvers/zod'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import IndustryCompanySizeFields from '../../../components/IndustryCompanySizeFields'
import ContactActionButtons from '../../../components/ContactActionButtons'
import LoadingSpinner from '../../../components/LoadingSpinner'
import {
  buildCompanySizeOptions,
  CRM_COMPANY_SIZES,
  industrySelectZ,
  optionalPhoneZ,
  optionalWebsiteZ,
  refineIndustryOther,
  resolveIndustryFromForm,
  splitIndustryForForm,
} from '../../../lib/crmFieldOptions'
import { Constants, type Database } from '../../../lib/supabase.types'
import type { CreateLeadInput } from '../api/leadsApi'

const leadStatusValues = Constants.public.Enums.lead_status
type LeadFormStatus = Database['public']['Enums']['lead_status']
const leadStatusZodEnum = z.enum(
  leadStatusValues as unknown as [LeadFormStatus, ...LeadFormStatus[]],
)

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
  status: CreateLeadInput['status']
}

type FormValues = {
  first_name?: string
  last_name?: string
  company?: string
  industry_select: string
  industry_other: string
  company_size: string
  website: string
  email: string
  phone: string
  source?: string
  details?: string
  status: LeadFormStatus
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
  const allowLegacyCompanySizeRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    const s = initialValues?.company_size?.trim() ?? ''
    allowLegacyCompanySizeRef.current =
      s && !(CRM_COMPANY_SIZES as readonly string[]).includes(s) ? s : null
  }, [initialValues?.company_size])

  const companySizeChoices = useMemo(
    () => buildCompanySizeOptions(initialValues?.company_size),
    [initialValues?.company_size],
  )

  const formSchema = useMemo(
    () =>
      z
        .object({
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          company: z.string().optional(),
          industry_select: industrySelectZ,
          industry_other: z.string(),
          company_size: z.string(),
          website: optionalWebsiteZ,
          email: z
            .string()
            .transform((s) => s.trim())
            .pipe(
              z.union([
                z.literal(''),
                z.string().email({ message: 'Enter a valid email address.' }),
              ]),
            ),
          phone: optionalPhoneZ,
          source: z.string().optional(),
          details: z.string().optional(),
          status: leadStatusZodEnum,
        })
        .superRefine((data, ctx) => refineIndustryOther(data, ctx))
        .superRefine((data, ctx) => {
          const t = (data.company_size ?? '').trim()
          if (!t) return
          if ((CRM_COMPANY_SIZES as readonly string[]).includes(t)) return
          if (allowLegacyCompanySizeRef.current && t === allowLegacyCompanySizeRef.current) return
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Select a company size from the list.',
            path: ['company_size'],
          })
        })
        .refine(
          (v) =>
            Boolean(
              (v.first_name ?? '').trim() ||
                (v.last_name ?? '').trim() ||
                (v.company ?? '').trim(),
            ),
          {
            message: 'Enter at least a first name, last name, or company.',
            path: ['first_name'],
          },
        ),
    [],
  )

  const ind = splitIndustryForForm(initialValues?.industry)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialValues?.first_name ?? '',
      last_name: initialValues?.last_name ?? '',
      company: initialValues?.company ?? '',
      industry_select: ind.industry_select,
      industry_other: ind.industry_other,
      company_size: initialValues?.company_size?.trim() ?? '',
      website: initialValues?.website ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      source: initialValues?.source ?? '',
      details: initialValues?.details ?? '',
      status: (initialValues?.status ?? 'New') as FormValues['status'],
    },
  })

  const { reset } = form
  useLayoutEffect(() => {
    const next = splitIndustryForForm(initialValues?.industry)
    reset({
      first_name: initialValues?.first_name ?? '',
      last_name: initialValues?.last_name ?? '',
      company: initialValues?.company ?? '',
      industry_select: next.industry_select,
      industry_other: next.industry_other,
      company_size: initialValues?.company_size?.trim() ?? '',
      website: initialValues?.website ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      source: initialValues?.source ?? '',
      details: initialValues?.details ?? '',
      status: (initialValues?.status ?? 'New') as FormValues['status'],
    })
  }, [
    reset,
    initialValues?.first_name,
    initialValues?.last_name,
    initialValues?.company,
    initialValues?.industry,
    initialValues?.company_size,
    initialValues?.website,
    initialValues?.email,
    initialValues?.phone,
    initialValues?.source,
    initialValues?.details,
    initialValues?.status,
  ])

  const emailVal = form.watch('email')
  const phoneVal = form.watch('phone')

  async function handleSubmit(values: FormValues) {
    await onSubmit({
      first_name: values.first_name?.trim() ? values.first_name.trim() : undefined,
      last_name: values.last_name?.trim() ? values.last_name.trim() : undefined,
      company: values.company?.trim() ? values.company.trim() : null,
      industry: resolveIndustryFromForm(values.industry_select, values.industry_other),
      company_size: values.company_size?.trim() ? values.company_size.trim() : null,
      website: values.website?.trim() ? values.website.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      phone: values.phone?.trim() ? values.phone.trim() : null,
      source: values.source?.trim() ? values.source.trim() : null,
      details: values.details?.trim() ? values.details.trim() : null,
      status: values.status as CreateLeadInput['status'],
    })
  }

  const { errors } = form.formState

  return (
    <form
      className="crm-form-dark grid grid-cols-1 md:grid-cols-2 gap-4"
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
        {errors.first_name?.message ? (
          <div className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {errors.first_name.message}
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

      <div className="contents">
        <IndustryCompanySizeFields
          register={form.register as never}
          watch={form.watch as never}
          errors={errors as never}
          companySizeChoices={companySizeChoices}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Website
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          placeholder="https://example.com"
          {...form.register('website')}
        />
        {errors.website?.message ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {errors.website.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          autoComplete="email"
          {...form.register('email')}
        />
        {errors.email?.message ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {errors.email.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Phone
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          autoComplete="tel"
          placeholder="+1 555 123 4567"
          {...form.register('phone')}
        />
        {errors.phone?.message ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {errors.phone.message}
          </span>
        ) : null}
      </label>

      <div className="md:col-span-2 flex flex-wrap items-center gap-2 min-h-[2rem]">
        <span className="text-sm text-slate-600 font-medium">Quick actions:</span>
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
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <LoadingSpinner />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  )
}

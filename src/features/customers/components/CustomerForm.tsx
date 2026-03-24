import { zodResolver } from '@hookform/resolvers/zod'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
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
import type { CreateCustomerInput } from '../api/customersApi'

const statusValues = ['Prospect', 'Active', 'OnHold', 'Churned'] as const
type CustomerStatus = (typeof statusValues)[number]
const statusEnum = z.enum(['Prospect', 'Active', 'OnHold', 'Churned'] as const)

const optionalText = z.string().optional()

type FormValues = {
  name: string
  primary_first_name?: string
  primary_last_name?: string
  primary_title?: string
  primary_email: string
  primary_phone: string
  industry_select: string
  industry_other: string
  company_size: string
  website: string
  billing_street?: string
  billing_city?: string
  billing_state?: string
  billing_postal_code?: string
  billing_country?: string
  status: CustomerStatus
}

export default function CustomerForm({
  initialValues,
  submitLabel,
  onSubmit,
  footerLeft,
}: {
  initialValues?: Partial<CreateCustomerInput>
  submitLabel: string
  onSubmit: (values: CreateCustomerInput) => Promise<void> | void
  footerLeft?: ReactNode
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

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(1, { message: 'Account name is required.' }),

          primary_first_name: optionalText,
          primary_last_name: optionalText,
          primary_title: optionalText,
          primary_email: z
            .string()
            .transform((s) => s.trim())
            .pipe(
              z.union([
                z.literal(''),
                z.string().email({ message: 'Enter a valid email address.' }),
              ]),
            ),
          primary_phone: optionalPhoneZ,

          industry_select: industrySelectZ,
          industry_other: z.string(),
          company_size: z.string(),
          website: optionalWebsiteZ,

          billing_street: optionalText,
          billing_city: optionalText,
          billing_state: optionalText,
          billing_postal_code: optionalText,
          billing_country: optionalText,

          status: statusEnum,
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
        }),
    [],
  )

  const ind = splitIndustryForForm(initialValues?.industry)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      primary_first_name: initialValues?.primary_first_name ?? '',
      primary_last_name: initialValues?.primary_last_name ?? '',
      primary_title: initialValues?.primary_title ?? '',
      primary_email: initialValues?.primary_email ?? '',
      primary_phone: initialValues?.primary_phone ?? '',
      industry_select: ind.industry_select,
      industry_other: ind.industry_other,
      company_size: initialValues?.company_size?.trim() ?? '',
      website: initialValues?.website ?? '',
      billing_street: initialValues?.billing_street ?? '',
      billing_city: initialValues?.billing_city ?? '',
      billing_state: initialValues?.billing_state ?? '',
      billing_postal_code: initialValues?.billing_postal_code ?? '',
      billing_country: initialValues?.billing_country ?? '',
      status: (initialValues?.status ?? 'Active') as CustomerStatus,
    },
  })

  const { reset } = form
  useLayoutEffect(() => {
    const next = splitIndustryForForm(initialValues?.industry)
    reset({
      name: initialValues?.name ?? '',
      primary_first_name: initialValues?.primary_first_name ?? '',
      primary_last_name: initialValues?.primary_last_name ?? '',
      primary_title: initialValues?.primary_title ?? '',
      primary_email: initialValues?.primary_email ?? '',
      primary_phone: initialValues?.primary_phone ?? '',
      industry_select: next.industry_select,
      industry_other: next.industry_other,
      company_size: initialValues?.company_size?.trim() ?? '',
      website: initialValues?.website ?? '',
      billing_street: initialValues?.billing_street ?? '',
      billing_city: initialValues?.billing_city ?? '',
      billing_state: initialValues?.billing_state ?? '',
      billing_postal_code: initialValues?.billing_postal_code ?? '',
      billing_country: initialValues?.billing_country ?? '',
      status: (initialValues?.status ?? 'Active') as CustomerStatus,
    })
  }, [
    reset,
    initialValues?.name,
    initialValues?.primary_first_name,
    initialValues?.primary_last_name,
    initialValues?.primary_title,
    initialValues?.primary_email,
    initialValues?.primary_phone,
    initialValues?.industry,
    initialValues?.company_size,
    initialValues?.website,
    initialValues?.billing_street,
    initialValues?.billing_city,
    initialValues?.billing_state,
    initialValues?.billing_postal_code,
    initialValues?.billing_country,
    initialValues?.status,
  ])

  const primaryEmail = form.watch('primary_email')
  const primaryPhone = form.watch('primary_phone')
  const accountName = form.watch('name')

  return (
    <form
      className="crm-form-dark grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          name: values.name.trim(),
          primary_first_name:
            values.primary_first_name && values.primary_first_name.trim()
              ? values.primary_first_name.trim()
              : null,
          primary_last_name:
            values.primary_last_name && values.primary_last_name.trim()
              ? values.primary_last_name.trim()
              : null,
          primary_title:
            values.primary_title && values.primary_title.trim()
              ? values.primary_title.trim()
              : null,
          primary_email:
            values.primary_email && values.primary_email.trim()
              ? values.primary_email.trim()
              : null,
          primary_phone:
            values.primary_phone && values.primary_phone.trim()
              ? values.primary_phone.trim()
              : null,
          industry: resolveIndustryFromForm(values.industry_select, values.industry_other),
          company_size:
            values.company_size && values.company_size.trim()
              ? values.company_size.trim()
              : null,
          website:
            values.website && values.website.trim() ? values.website.trim() : null,
          billing_street:
            values.billing_street && values.billing_street.trim()
              ? values.billing_street.trim()
              : null,
          billing_city:
            values.billing_city && values.billing_city.trim()
              ? values.billing_city.trim()
              : null,
          billing_state:
            values.billing_state && values.billing_state.trim()
              ? values.billing_state.trim()
              : null,
          billing_postal_code:
            values.billing_postal_code && values.billing_postal_code.trim()
              ? values.billing_postal_code.trim()
              : null,
          billing_country:
            values.billing_country && values.billing_country.trim()
              ? values.billing_country.trim()
              : null,
          status: values.status,
        })
      })}
    >
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Account name
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {form.formState.errors.name.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact first name
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('primary_first_name')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact last name
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('primary_last_name')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Title
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('primary_title')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          autoComplete="email"
          {...form.register('primary_email')}
        />
        {form.formState.errors.primary_email ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {form.formState.errors.primary_email.message}
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
          {...form.register('primary_phone')}
        />
        {form.formState.errors.primary_phone ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {form.formState.errors.primary_phone.message}
          </span>
        ) : null}
      </label>

      <div className="md:col-span-2 flex flex-wrap items-center gap-2 min-h-[2rem]">
        <span className="text-xs opacity-70">Quick actions:</span>
        <ContactActionButtons
          phone={primaryPhone}
          email={primaryEmail}
          contactLabel={accountName?.trim() || undefined}
        />
      </div>

      <div className="contents">
        <IndustryCompanySizeFields
          register={form.register as never}
          watch={form.watch as never}
          errors={form.formState.errors as never}
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
        {form.formState.errors.website ? (
          <span className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {form.formState.errors.website.message}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Billing street
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('billing_street')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Billing city
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('billing_city')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Billing state
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('billing_state')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Postal code
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('billing_postal_code')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Country
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('billing_country')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Customer status
        <select
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('status')}
        >
          {statusValues.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2 flex items-center justify-between gap-2">
        <div>{footerLeft ?? null}</div>
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

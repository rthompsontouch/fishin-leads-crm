import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import ContactActionButtons from '../../../components/ContactActionButtons'
import type { CreateCustomerInput } from '../api/customersApi'

const statusValues = ['Prospect', 'Active', 'OnHold', 'Churned'] as const
type CustomerStatus = (typeof statusValues)[number]
const statusEnum = z.enum(['Prospect', 'Active', 'OnHold', 'Churned'] as const)

const schema = z.object({
  name: z.string().min(1, { message: 'Account name is required.' }),

  primary_first_name: z.string().optional().or(z.literal('')),
  primary_last_name: z.string().optional().or(z.literal('')),
  primary_title: z.string().optional().or(z.literal('')),
  primary_email: z.string().email().optional().or(z.literal('')),
  primary_phone: z.string().optional().or(z.literal('')),

  industry: z.string().optional().or(z.literal('')),
  company_size: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),

  billing_street: z.string().optional().or(z.literal('')),
  billing_city: z.string().optional().or(z.literal('')),
  billing_state: z.string().optional().or(z.literal('')),
  billing_postal_code: z.string().optional().or(z.literal('')),
  billing_country: z.string().optional().or(z.literal('')),

  status: statusEnum,
})

type FormValues = z.infer<typeof schema>

export default function CustomerForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<CreateCustomerInput>
  submitLabel: string
  onSubmit: (values: CreateCustomerInput) => Promise<void> | void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      primary_first_name: initialValues?.primary_first_name ?? '',
      primary_last_name: initialValues?.primary_last_name ?? '',
      primary_title: initialValues?.primary_title ?? '',
      primary_email: initialValues?.primary_email ?? '',
      primary_phone: initialValues?.primary_phone ?? '',
      industry: initialValues?.industry ?? '',
      company_size: initialValues?.company_size ?? '',
      website: initialValues?.website ?? '',
      billing_street: initialValues?.billing_street ?? '',
      billing_city: initialValues?.billing_city ?? '',
      billing_state: initialValues?.billing_state ?? '',
      billing_postal_code: initialValues?.billing_postal_code ?? '',
      billing_country: initialValues?.billing_country ?? '',
      status: (initialValues?.status ?? 'Active') as CustomerStatus,
    },
  })

  const primaryEmail = form.watch('primary_email')
  const primaryPhone = form.watch('primary_phone')
  const accountName = form.watch('name')

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
          industry:
            values.industry && values.industry.trim() ? values.industry.trim() : null,
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
          {...form.register('primary_email')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Phone
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('primary_phone')}
        />
      </label>

      <div className="md:col-span-2 flex flex-wrap items-center gap-2 min-h-[2rem]">
        <span className="text-xs opacity-70">Quick actions:</span>
        <ContactActionButtons
          phone={primaryPhone}
          email={primaryEmail}
          contactLabel={accountName?.trim() || undefined}
        />
      </div>

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

      <div className="md:col-span-2 flex justify-end">
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


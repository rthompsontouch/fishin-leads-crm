import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import FormFieldError from '../../../components/FormFieldError'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { Constants } from '../../../lib/supabase.types'
import type { CreateIntegrationInput } from '../api/integrationsApi'

const leadStatusValues = Constants.public.Enums.lead_status
const defaultStatusEnum = z.enum(
  leadStatusValues as unknown as [string, ...string[]],
)

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  source_label: z.string().min(1, 'Source label is required.'),
  default_status: defaultStatusEnum,
  enabled: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export default function IntegrationCreateForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string
  onSubmit: (values: CreateIntegrationInput) => Promise<void> | void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      source_label: 'Website Form',
      default_status: 'New',
      enabled: true,
    },
  })

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4 [color-scheme:light]"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          name: values.name.trim(),
          source_label: values.source_label.trim(),
          default_status: values.default_status as CreateIntegrationInput['default_status'],
          enabled: values.enabled ?? true,
        })
      })}
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
        Integration name
        <input
          className="rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)]"
          {...form.register('name')}
        />
        <FormFieldError message={form.formState.errors.name?.message} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
        Source label
        <input
          className="rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)]"
          {...form.register('source_label')}
        />
        <FormFieldError message={form.formState.errors.source_label?.message} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 md:col-span-2">
        Default lead status
        <select
          className="rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)]"
          {...form.register('default_status')}
        >
          {leadStatusValues.map((s) => (
            <option key={s} value={s} className="bg-white text-slate-900">
              {s}
            </option>
          ))}
        </select>
        <FormFieldError message={form.formState.errors.default_status?.message} />
      </label>

      <div className="md:col-span-2 flex items-center gap-2">
        <input
          id="enabled"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          {...form.register('enabled')}
        />
        <label htmlFor="enabled" className="text-sm cursor-pointer text-slate-700">
          Enabled
        </label>
      </div>

      <div className="md:col-span-2 flex justify-end">
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

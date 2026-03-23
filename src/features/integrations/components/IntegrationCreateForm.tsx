import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CreateIntegrationInput } from '../api/integrationsApi'

const statusValues = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  source_label: z.string().min(1, 'Source label is required.'),
  default_status: z.enum(statusValues as unknown as [string, ...string[]]),
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
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({
          name: values.name.trim(),
          source_label: values.source_label.trim(),
          default_status: values.default_status as any,
          enabled: values.enabled ?? true,
        })
      })}
    >
      <label className="flex flex-col gap-1 text-sm">
        Integration name
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('name')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Source label
        <input
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('source_label')}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Default lead status
        <select
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          {...form.register('default_status')}
        >
          {statusValues.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2 flex items-center gap-2">
        <input
          id="enabled"
          type="checkbox"
          className="h-4 w-4"
          {...form.register('enabled')}
        />
        <label htmlFor="enabled" className="text-sm opacity-80 cursor-pointer">
          Enabled
        </label>
      </div>

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


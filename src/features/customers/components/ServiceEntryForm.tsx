import { useMemo, useState } from 'react'
import type { CreateServiceEntryInput } from '../api/customersApi'
import { addServiceEntryWithImages } from '../api/customersApi'

const currencyValues = ['USD', 'CAD', 'GBP', 'EUR'] as const

export default function ServiceEntryForm({
  customerId,
  onAdded,
  onError,
}: {
  customerId: string
  onAdded: () => Promise<void>
  onError: (msg: string) => void
}) {
  const [service_date, setServiceDate] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [description, setDescription] = useState('')
  const [price_amount, setPriceAmount] = useState<string>('')
  const [price_currency, setPriceCurrency] = useState<(typeof currencyValues)[number]>('USD')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const attachmentsHint = useMemo(() => {
    if (files.length === 0) return 'Optional images.'
    return `${files.length} image(s) selected.`
  }, [files.length])

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!customerId) return
        if (!service_date) {
          onError('Service date is required.')
          return
        }
        if (!description.trim()) {
          onError('Description is required.')
          return
        }

        setSubmitting(true)
        try {
          const input: CreateServiceEntryInput = {
            service_date: service_date,
            description: description.trim(),
            price_amount:
              price_amount.trim() === '' ? null : Number(price_amount),
            price_currency,
          }

          await addServiceEntryWithImages(customerId, input, files)
          setDescription('')
          setPriceAmount('')
          setFiles([])
          await onAdded()
        } catch (err) {
          onError(String((err as Error).message ?? err))
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Service date
        <input
          type="date"
          value={service_date}
          onChange={(e) => setServiceDate(e.target.value)}
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Price currency
        <select
          value={price_currency}
          onChange={(e) => setPriceCurrency(e.target.value as any)}
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {currencyValues.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)', minHeight: 92 }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Price amount (optional)
        <input
          value={price_amount}
          onChange={(e) => setPriceAmount(e.target.value)}
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          inputMode="decimal"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Images (optional)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? [])
            setFiles(list)
          }}
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
        />
        <div className="text-xs opacity-70">{attachmentsHint}</div>
      </label>

      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Add service'}
        </button>
      </div>
    </form>
  )
}


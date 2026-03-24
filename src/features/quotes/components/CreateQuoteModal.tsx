import { useMemo, useState } from 'react'
import ModalScrollBackdrop from '../../../components/ModalScrollBackdrop'
import type { LeadRow } from '../api/quotesApi'
import { createQuoteFromLead } from '../api/quotesApi'

export default function CreateQuoteModal({
  open,
  lead,
  onClose,
  onCreated,
}: {
  open: boolean
  lead: LeadRow
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const currencyValues = ['USD', 'CAD', 'GBP', 'EUR'] as const

  const [priceAmount, setPriceAmount] = useState<string>('')
  const [priceCurrency, setPriceCurrency] = useState<(typeof currencyValues)[number]>('USD')
  const [description, setDescription] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])

  const [lineItems, setLineItems] = useState<
    Array<{ id: string; description: string; quantity: number; unit_price: string }>
  >([{ id: crypto.randomUUID(), description: '', quantity: 1, unit_price: '' }])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recipient = useMemo(() => {
    if (lead.company?.trim()) return lead.company
    const full = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    return full || 'Quote recipient'
  }, [lead.company, lead.first_name, lead.last_name])

  if (!open) return null

  return (
    <ModalScrollBackdrop onBackdropClose={onClose} zClass="z-50" role="dialog" aria-modal>
      <div
        className="crm-modal-panel-mobile-fs my-4 w-full max-w-[min(900px,100%)] max-h-[min(92dvh,900px)] min-h-0 flex flex-col rounded-xl border shadow-lg overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 p-5 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="text-xs opacity-70">Create quote for</div>
            <div className="text-lg font-semibold mt-1">{recipient}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]"
          >
            Close
          </button>
        </div>

        <form
          className="flex flex-col flex-1 min-h-0 overflow-y-auto crm-scrollbar p-5 pt-4 gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)

            const price = Number(priceAmount)
            if (!Number.isFinite(price) || price <= 0) {
              setError('Price is required (number > 0).')
              return
            }

            const items = lineItems
              .map((li) => {
                const unit = Number(li.unit_price)
                return {
                  description: li.description.trim(),
                  quantity: Math.max(1, Math.floor(Number(li.quantity) || 1)),
                  unit_price: Number.isFinite(unit) ? unit : 0,
                }
              })
              .filter((li) => li.description)

            const desc = description.trim() ? description.trim() : null

            setSubmitting(true)
            try {
              await createQuoteFromLead(
                lead.id,
                {
                  price_amount: price,
                  price_currency: priceCurrency,
                  description: desc,
                  line_items: items.length > 0 ? items : undefined,
                },
                files,
              )
              await onCreated()
              onClose()
            } catch (err) {
              setError(String((err as Error).message ?? err))
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Price (required)
              <input
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                inputMode="decimal"
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)' }}
                placeholder="e.g. 2500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Currency
              <select
                value={priceCurrency}
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
              Description (optional)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-md border px-3 py-2 outline-none"
                style={{ borderColor: 'var(--color-border)', minHeight: 92 }}
              />
            </label>
          </div>

          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-sm font-semibold mb-2">Optional line items</div>
            <div className="flex flex-col gap-3">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <label className="flex flex-col gap-1 text-sm md:col-span-2">
                    Description
                    <input
                      value={li.description}
                      onChange={(e) => {
                        const v = e.target.value
                        setLineItems((prev) =>
                          prev.map((x) => (x.id === li.id ? { ...x, description: v } : x)),
                        )
                      }}
                      className="rounded-md border px-3 py-2 outline-none"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    Qty
                    <input
                      value={String(li.quantity)}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setLineItems((prev) =>
                          prev.map((x) =>
                            x.id === li.id ? { ...x, quantity: Number.isFinite(v) ? v : 1 } : x,
                          ),
                        )
                      }}
                      inputMode="numeric"
                      className="rounded-md border px-3 py-2 outline-none"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    Unit price
                    <input
                      value={li.unit_price}
                      onChange={(e) => {
                        const v = e.target.value
                        setLineItems((prev) =>
                          prev.map((x) => (x.id === li.id ? { ...x, unit_price: v } : x)),
                        )
                      }}
                      inputMode="decimal"
                      className="rounded-md border px-3 py-2 outline-none"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </label>

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={lineItems.length <= 1}
                      onClick={() => {
                        setLineItems((prev) => prev.filter((x) => x.id !== li.id))
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]"
                  onClick={() => {
                    setLineItems((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: '' },
                    ])
                  }}
                  disabled={lineItems.length >= 10}
                >
                  Add line item
                </button>
              </div>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Quote photos (optional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="rounded-md border px-3 py-2 outline-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <div className="text-xs opacity-70">{files.length === 0 ? 'No files selected.' : `${files.length} image(s) selected.`}</div>
          </label>

          {error ? (
            <div className="text-sm rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Create quote'}
            </button>
          </div>
        </form>
      </div>
    </ModalScrollBackdrop>
  )
}


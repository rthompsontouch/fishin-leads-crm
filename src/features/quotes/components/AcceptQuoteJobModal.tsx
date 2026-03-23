import { useEffect, useMemo, useState } from 'react'
import type { LeadRow, QuoteRow } from '../api/quotesApi'
import { markQuoteWon } from '../api/quotesApi'
import { createJobFromQuote } from '../../jobs/api/jobsApi'
import { convertLeadToCustomer, mergeLeadIntoCustomer } from '../../leads/api/leadsApi'
import { findCustomersByEmailOrPhone } from '../../customers/api/customersApi'

export default function AcceptQuoteJobModal({
  open,
  lead,
  quote,
  onClose,
  onAccepted,
}: {
  open: boolean
  lead: LeadRow
  quote: QuoteRow
  onClose: () => void
  onAccepted: () => Promise<void>
}) {
  const [matches, setMatches] = useState<Array<{ id: string; name: string; primary_email: string | null; primary_phone: string | null }>>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [jobNotes, setJobNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceUnit, setRecurrenceUnit] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [reminderAtLocal, setReminderAtLocal] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recipient = useMemo(() => {
    if (lead.company?.trim()) return lead.company
    const full = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    return full || 'Lead recipient'
  }, [lead.company, lead.first_name, lead.last_name])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSubmitting(false)

    const run = async () => {
      setLoadingMatches(true)
      try {
        const found = await findCustomersByEmailOrPhone({
          email: lead.email,
          phone: lead.phone,
        })

        const simplified = (found ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          primary_email: (c as any).primary_email ?? (c as any).email ?? null,
          primary_phone: (c as any).primary_phone ?? (c as any).phone ?? null,
        }))

        setMatches(simplified)
        if (simplified.length > 0) {
          setMode('existing')
          setSelectedCustomerId(simplified[0].id)
        } else {
          setMode('new')
          setSelectedCustomerId(null)
        }
      } catch (e) {
        setError(String((e as Error).message ?? e))
      } finally {
        setLoadingMatches(false)
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    // When switching to "new", clear selection.
    if (mode === 'new') setSelectedCustomerId(null)
  }, [mode, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(980px,92vw)] rounded-xl border p-5 overflow-hidden"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs opacity-70">Accept quote & create job</div>
            <div className="text-lg font-semibold mt-1">
              {recipient} • {quote.price_currency} {quote.price_amount}
            </div>
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
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setSubmitting(true)

            try {
              // 1) Mark quote won (DB trigger updates lead.status -> Won).
              await markQuoteWon(quote.id, null)

              // 2) Merge lead into existing customer OR create a new one.
              let customerId: string
              if (mode === 'existing') {
                if (!selectedCustomerId) throw new Error('Select a customer to merge into.')
                const merged = await mergeLeadIntoCustomer(lead.id, selectedCustomerId)
                customerId = merged.id
              } else {
                const created = await convertLeadToCustomer(lead.id)
                customerId = created.id
              }

              // 3) Ensure quote points to the chosen customer.
              await markQuoteWon(quote.id, customerId)

              // 4) Create the scheduled job.
              const reminderAt = reminderAtLocal ? new Date(reminderAtLocal) : null

              await createJobFromQuote({
                lead_id: lead.id,
                quote_id: quote.id,
                customer_id: customerId,
                scheduled_date: scheduledDate,
                notes: jobNotes.trim() ? jobNotes.trim() : null,
                is_recurring: isRecurring,
                recurrence_unit: isRecurring ? recurrenceUnit : null,
                reminder_at: reminderAt,
              })

              await onAccepted()
              onClose()
            } catch (err) {
              setError(String((err as Error).message ?? err))
            } finally {
              setSubmitting(false)
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-sm font-semibold mb-2">Customer</div>
              {loadingMatches ? (
                <div className="text-sm opacity-80">Searching for matching customer…</div>
              ) : (
                <>
                  {matches.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="radio"
                          checked={mode === 'existing'}
                          onChange={() => setMode('existing')}
                        />
                        <span>Merge into an existing customer</span>
                      </label>

                      <select
                        value={selectedCustomerId ?? ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="rounded-md border px-3 py-2 outline-none"
                        style={{ borderColor: 'var(--color-border)' }}
                        disabled={mode !== 'existing'}
                      >
                        {matches.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="radio"
                          checked={mode === 'new'}
                          onChange={() => setMode('new')}
                        />
                        <span>Create a new customer instead</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-sm opacity-80">No matching customer found.</div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-sm font-semibold mb-2">Scheduling</div>
              <label className="flex flex-col gap-1 text-sm">
                Scheduled date
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm mt-3">
                Notes (optional)
                <textarea
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)', minHeight: 72 }}
                />
              </label>

              <div className="flex items-center gap-3 mt-3">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <div className="text-sm font-semibold">Recurring</div>
              </div>

              {isRecurring ? (
                <div className="mt-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Recurrence
                    <select
                      value={recurrenceUnit}
                      onChange={(e) => setRecurrenceUnit(e.target.value as any)}
                      className="rounded-md border px-3 py-2 outline-none"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                </div>
              ) : null}

              <label className="flex flex-col gap-1 text-sm mt-3">
                Reminder (optional)
                <input
                  type="datetime-local"
                  value={reminderAtLocal}
                  onChange={(e) => setReminderAtLocal(e.target.value)}
                  className="rounded-md border px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </label>
            </div>
          </div>

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
              {submitting ? 'Creating job…' : 'Mark Won & Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


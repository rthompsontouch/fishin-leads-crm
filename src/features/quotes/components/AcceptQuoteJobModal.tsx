import { useEffect, useMemo, useState } from 'react'
import ModalScrollBackdrop from '../../../components/ModalScrollBackdrop'
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
    <ModalScrollBackdrop onBackdropClose={onClose} zClass="z-50" role="dialog" aria-modal>
      <div
        className="crm-modal-panel-mobile-fs crm-light-surface crm-form-dark my-4 w-full max-w-[min(980px,100%)] max-h-[min(92dvh,920px)] min-h-0 flex flex-col rounded-xl border border-[color:hsl(215_22%_82%)] bg-white shadow-lg overflow-hidden text-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 flex items-start justify-between gap-4 p-5 pb-3 border-b border-[color:hsl(215_22%_82%)] bg-white"
        >
          <div>
            <div className="text-xs text-slate-600">Accept quote & create job</div>
            <div className="text-lg font-semibold mt-1 text-slate-900">
              {recipient} • {quote.price_currency} {quote.price_amount}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto crm-scrollbar bg-white p-5 pt-4">

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
          className="flex flex-col gap-4 text-slate-900"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <div className="text-sm font-semibold mb-2 text-slate-900">Customer</div>
              {loadingMatches ? (
                <div className="text-sm text-slate-600">Searching for matching customer…</div>
              ) : (
                <>
                  {matches.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <label className="flex items-start gap-2 text-sm text-slate-900">
                        <input
                          type="radio"
                          checked={mode === 'existing'}
                          onChange={() => setMode('existing')}
                          className="mt-0.5"
                        />
                        <span>Merge into an existing customer</span>
                      </label>

                      <select
                        value={selectedCustomerId ?? ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                        disabled={mode !== 'existing'}
                      >
                        {matches.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-start gap-2 text-sm text-slate-900">
                        <input
                          type="radio"
                          checked={mode === 'new'}
                          onChange={() => setMode('new')}
                          className="mt-0.5"
                        />
                        <span>Create a new customer instead</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">No matching customer found.</div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <div className="text-sm font-semibold mb-2 text-slate-900">Scheduling</div>
              <label className="flex flex-col gap-1 text-sm text-slate-900">
                Scheduled date
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm mt-3 text-slate-900">
                Notes (optional)
                <textarea
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                  style={{ minHeight: 72 }}
                />
              </label>

              <div className="flex items-center gap-3 mt-3">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <div className="text-sm font-semibold text-slate-900">Recurring</div>
              </div>

              {isRecurring ? (
                <div className="mt-2">
                  <label className="flex flex-col gap-1 text-sm text-slate-900">
                    Recurrence
                    <select
                      value={recurrenceUnit}
                      onChange={(e) => setRecurrenceUnit(e.target.value as any)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                </div>
              ) : null}

              <label className="flex flex-col gap-1 text-sm mt-3 text-slate-900">
                Reminder (optional)
                <input
                  type="datetime-local"
                  value={reminderAtLocal}
                  onChange={(e) => setReminderAtLocal(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none"
                />
              </label>
            </div>
          </div>

          {error ? (
            <div className="text-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="crm-cancel-btn rounded-md px-3 py-2 text-sm font-semibold cursor-pointer"
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
    </ModalScrollBackdrop>
  )
}


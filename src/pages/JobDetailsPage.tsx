import { useMemo, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { completeJob, getJobById } from '../features/jobs/api/jobsApi'
import { getQuoteById } from '../features/quotes/api/quotesApi'

function isLikelyUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export default function JobDetailsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const safeJobId = useMemo(() => (jobId ? String(jobId) : ''), [jobId])
  const enabled = Boolean(safeJobId) && isLikelyUuid(safeJobId)

  const {
    data: job,
    isPending,
    error,
  } = useQuery({
    queryKey: ['job', safeJobId],
    queryFn: () => getJobById(safeJobId),
    enabled,
  })

  const { data: quote } = useQuery({
    queryKey: ['quote', job?.quote_id],
    queryFn: () => getQuoteById(job!.quote_id),
    enabled: Boolean(job?.quote_id),
  })

  const [files, setFiles] = useState<File[]>([])
  const [completedNotes, setCompletedNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uiError, setUiError] = useState<string | null>(null)

  const reminderLabel = useMemo(() => {
    if (!job?.reminder_at) return null
    try {
      const d = new Date(job.reminder_at)
      return d.toLocaleString()
    } catch {
      return String(job.reminder_at)
    }
  }, [job?.reminder_at])

  return (
    <div className="flex flex-col gap-6 max-md:pt-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs opacity-70">
            <Link to="/">Dashboard</Link>
            <span className="opacity-60"> / </span>
            <span className="opacity-95">Job</span>
          </div>
          <h1 className="text-2xl font-semibold mt-1">
            {isPending ? 'Loading…' : job ? 'Scheduled Job' : 'Job'}
          </h1>
          <div className="text-sm opacity-80 mt-2">
            {job ? `Scheduled: ${job.scheduled_date}` : null}
          </div>
        </div>
        <div className="flex gap-2">
          {job ? (
            <Link to={`/customers/${job.customer_id}`} className="rounded-md px-3 py-2 text-sm font-semibold border border-[color:var(--color-border)] bg-transparent hover:bg-[color:var(--color-surface-2)]">
              Customer
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md px-3 py-2 text-sm font-semibold border border-[color:var(--color-border)] bg-transparent hover:bg-[color:var(--color-surface-2)]"
          >
            Back
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}>
          Failed to load job. {String((error as Error).message)}
        </div>
      ) : null}

      {job ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-sm font-semibold mb-3">Job details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs opacity-70">Quote</div>
                <div className="text-sm font-semibold break-all">
                  {quote ? `${quote.price_currency} ${quote.price_amount}` : job.quote_id}
                </div>
                {quote?.description?.trim() ? (
                  <div className="text-xs opacity-70 mt-1 whitespace-pre-wrap">{quote.description}</div>
                ) : null}
              </div>
              <div>
                <div className="text-xs opacity-70">Status</div>
                <div className="text-sm font-semibold">{job.status}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Recurrence</div>
                <div className="text-sm font-semibold">
                  {job.is_recurring ? `Recurring (${job.recurrence_unit ?? 'weekly'})` : 'One-time'}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">Reminder</div>
                <div className="text-sm font-semibold">
                  {job.reminder_at ? (job.reminder_sent_at ? 'Sent' : `Due: ${reminderLabel}`) : '—'}
                </div>
              </div>
            </div>
            {job.notes ? (
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs opacity-70">Notes</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{job.notes}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-sm font-semibold mb-3">Complete</div>
            {job.status !== 'Scheduled' ? (
              <div className="text-sm opacity-80">This job is already completed.</div>
            ) : (
              <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setUiError(null)

                  if (!files || files.length === 0) {
                    // photos are optional; proceed
                  }

                  setSubmitting(true)
                  try {
                    await completeJob(safeJobId, {
                      files,
                      completed_notes: completedNotes.trim() ? completedNotes.trim() : null,
                    })
                    setFiles([])
                    setCompletedNotes('')
                    await queryClient.invalidateQueries({ queryKey: ['job', safeJobId], exact: false })
                    await queryClient.invalidateQueries({ queryKey: ['jobs-upcoming'], exact: false })
                    await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
                  } catch (err) {
                    setUiError(String((err as Error).message ?? err))
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                <label className="flex flex-col gap-1 text-sm">
                  Upload attachments (optional)
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <div className="text-xs opacity-70">{files.length ? `${files.length} selected` : 'No attachments selected'}</div>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Completed notes (optional)
                  <textarea
                    value={completedNotes}
                    onChange={(e) => setCompletedNotes(e.target.value)}
                    className="rounded-md border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)', minHeight: 96 }}
                  />
                </label>

                {uiError ? (
                  <div className="text-sm rounded-lg border px-3 py-2" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-danger)' }}>
                    {uiError}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving…' : 'Mark Complete'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}


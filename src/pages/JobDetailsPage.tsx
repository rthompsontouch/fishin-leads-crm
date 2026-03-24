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

  const outlineBtn =
    'rounded-md px-3 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 bg-white hover:bg-slate-50'

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <h1 className="crm-page-header-title">
          {isPending ? 'Loading…' : job ? (job.status === 'Scheduled' ? 'Scheduled job' : 'Job') : 'Job'}
        </h1>
        <div className="flex flex-wrap gap-2">
          {job ? (
            <Link
              to={`/customers/${job.customer_id}`}
              className={`${outlineBtn} no-underline inline-flex items-center justify-center`}
              style={{
                color: 'var(--crm-content-header-text)',
                borderColor: 'hsl(215 22% 55%)',
              }}
            >
              Customer
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={outlineBtn}
            style={{
              color: 'var(--crm-content-header-text)',
              borderColor: 'hsl(215 22% 55%)',
            }}
          >
            Back
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-4 text-sm"
          style={{ color: 'var(--color-danger)' }}
        >
          Failed to load job. {String((error as Error).message)}
        </div>
      ) : null}

      {job ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5 overflow-hidden">
            <div
              className="text-sm font-semibold mb-4 pb-3 border-b"
              style={{ borderColor: 'hsl(215 20% 88%)', color: 'var(--crm-content-header-text)' }}
            >
              Job details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-500">Quote</div>
                <div className="text-sm font-semibold break-all mt-0.5" style={{ color: 'var(--crm-content-header-text)' }}>
                  {quote ? `${quote.price_currency} ${quote.price_amount}` : job.quote_id}
                </div>
                {quote?.description?.trim() ? (
                  <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{quote.description}</div>
                ) : null}
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Status</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--crm-content-header-text)' }}>
                  {job.status}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Recurrence</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--crm-content-header-text)' }}>
                  {job.is_recurring ? `Recurring (${job.recurrence_unit ?? 'weekly'})` : 'One-time'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Reminder</div>
                <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--crm-content-header-text)' }}>
                  {job.reminder_at ? (job.reminder_sent_at ? 'Sent' : `Due: ${reminderLabel}`) : '—'}
                </div>
              </div>
            </div>
            {job.notes ? (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(215 20% 88%)' }}>
                <div className="text-xs font-medium text-slate-500">Notes</div>
                <div className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--crm-content-header-text)' }}>
                  {job.notes}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-5 overflow-hidden">
            <div
              className="text-sm font-semibold mb-4 pb-3 border-b"
              style={{ borderColor: 'hsl(215 20% 88%)', color: 'var(--crm-content-header-text)' }}
            >
              Complete
            </div>
            {job.status !== 'Scheduled' ? (
              <div className="text-sm text-slate-600">This job is already completed.</div>
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
                    await queryClient.invalidateQueries({ queryKey: ['jobs-list'], exact: false })
                    await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
                  } catch (err) {
                    setUiError(String((err as Error).message ?? err))
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                <label
                  className="flex flex-col gap-1.5 text-sm font-medium"
                  style={{ color: 'var(--crm-content-header-text)' }}
                >
                  Upload attachments (optional)
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="rounded-md border-2 px-3 py-2 outline-none text-sm font-normal focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1"
                    style={{ borderColor: 'hsl(215 22% 72%)' }}
                  />
                  <div className="text-xs font-normal text-slate-600">
                    {files.length ? `${files.length} selected` : 'No attachments selected'}
                  </div>
                </label>

                <label
                  className="flex flex-col gap-1.5 text-sm font-medium"
                  style={{ color: 'var(--crm-content-header-text)' }}
                >
                  Completed notes (optional)
                  <textarea
                    value={completedNotes}
                    onChange={(e) => setCompletedNotes(e.target.value)}
                    className="rounded-md border-2 px-3 py-2 outline-none text-sm font-normal min-h-[96px] focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1"
                    style={{ borderColor: 'hsl(215 22% 72%)', color: 'var(--crm-content-header-text)' }}
                  />
                </label>

                {uiError ? (
                  <div
                    className="text-sm rounded-lg border-2 px-3 py-2 bg-slate-50"
                    style={{ borderColor: 'hsl(215 22% 72%)', color: 'var(--color-danger)' }}
                  >
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


import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listJobs } from '../features/jobs/api/jobsApi'

export default function JobsPage() {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const { data, isPending, error } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => listJobs(),
  })

  const rows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return (data ?? []).filter((job) => {
      if (filter === 'scheduled' && job.status !== 'Scheduled') return false
      if (filter === 'completed' && job.status !== 'Completed') return false
      if (!q) return true
      const haystack = [
        job.customer?.name ?? '',
        job.notes ?? '',
        job.quote?.description ?? '',
        job.status,
        job.scheduled_date,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [data, filter, debouncedSearch])

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <h1 className="crm-page-header-title">Jobs</h1>
      </div>

      <p
        className="text-sm m-0 leading-relaxed -mt-0.5"
        style={{ color: 'var(--crm-content-header-text)' }}
      >
        Jobs are scheduled when you accept a quote or add one from a customer record.{' '}
        <Link
          to="/customers"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          View customers
        </Link>
      </p>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Job list
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:justify-end">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full sm:max-w-xs rounded-md border-2 bg-white px-3 py-2 text-sm outline-none min-w-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1 placeholder:text-slate-500"
              style={{
                borderColor: 'hsl(215 22% 72%)',
                color: 'var(--crm-content-header-text)',
              }}
              disabled={isPending}
            />
            <div className="flex flex-wrap gap-2 shrink-0">
              {(['all', 'scheduled', 'completed'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-4 py-2.5 min-h-11 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 ${
                    filter === value
                      ? 'bg-[color:var(--color-primary)] text-white border-transparent hover:bg-[color:var(--color-primary-dark)] shadow-sm'
                      : 'bg-white hover:bg-slate-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={
                    filter === value
                      ? undefined
                      : {
                          color: 'var(--crm-content-header-text)',
                          borderColor: 'hsl(215 22% 55%)',
                        }
                  }
                  disabled={isPending}
                >
                  {value === 'all' ? 'All' : value === 'scheduled' ? 'Scheduled' : 'Completed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-[1.2fr_1fr_0.9fr_1fr_auto] gap-2 bg-slate-100 p-3 text-sm font-semibold items-center"
          style={{ color: 'var(--crm-content-header-text)' }}
        >
          <div className="truncate">Customer</div>
          <div className="truncate">Scheduled</div>
          <div className="truncate">Status</div>
          <div className="truncate">Quote</div>
          <div className="w-8 shrink-0" aria-hidden />
        </div>

        {isPending ? (
          <div className="p-6 text-sm" style={{ color: 'var(--crm-content-header-text)', opacity: 0.85 }}>
            Loading jobs...
          </div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load jobs. {String((error as Error).message)}
          </div>
        ) : (data?.length ?? 0) > 0 && rows.length === 0 && debouncedSearch.trim() ? (
          <div className="p-6">
            <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
              No jobs match your search.
            </div>
            <div className="text-xs mt-2 text-slate-600">
              Try customer name, date, status, or quote details.
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
              No jobs found.
            </div>
            <div className="text-xs mt-2 text-slate-600">
              {filter === 'scheduled'
                ? 'No scheduled jobs — accept a quote or schedule from a customer to add one.'
                : filter === 'completed'
                  ? 'Completed jobs will appear here after you mark work as done.'
                  : 'Accept a winning quote or create a job from a customer profile.'}
            </div>
          </div>
        ) : (
          <div className="px-2 pt-2 pb-0">
            {rows.map((job, idx) => {
              const scheduledLabel = (() => {
                try {
                  const [y, m, d] = job.scheduled_date.split('-').map(Number)
                  if (!y || !m || !d) return job.scheduled_date
                  return new Date(y, m - 1, d).toLocaleDateString()
                } catch {
                  return job.scheduled_date
                }
              })()

              const statusColor =
                job.status === 'Completed'
                  ? 'var(--color-success)'
                  : job.status === 'Scheduled'
                    ? 'var(--color-info)'
                    : 'var(--color-accent)'

              const quoteLabel = job.quote
                ? `${job.quote.price_currency} ${job.quote.price_amount}`
                : '—'

              const isLast = idx === rows.length - 1

              return (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  aria-label={`Open job: ${job.customer?.name ?? 'Customer'}, ${job.scheduled_date}`}
                  className={`grid grid-cols-[1.2fr_1fr_0.9fr_1fr_auto] gap-2 px-3 py-3 min-h-[3.25rem] items-center border-b transition-colors hover:bg-slate-50 ${isLast ? 'border-b-0' : ''}`}
                  style={{
                    borderColor: 'hsl(215 20% 88%)',
                    textDecoration: 'none',
                    color: 'var(--crm-content-header-text)',
                  }}
                >
                  <div className="truncate text-base md:text-sm font-semibold min-w-0">
                    {job.customer?.name ?? '—'}
                  </div>
                  <div className="truncate text-sm text-slate-700">{scheduledLabel}</div>
                  <div className="text-sm font-semibold min-w-0">
                    <span
                      className="inline-flex rounded-full px-2.5 py-1.5 max-w-full truncate"
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                        border: '1px solid hsl(215 22% 78%)',
                      }}
                    >
                      <span style={{ color: statusColor }} className="truncate">
                        {job.status}
                      </span>
                    </span>
                  </div>
                  <div className="truncate text-sm text-slate-700">{quoteLabel}</div>
                  <div className="flex justify-end text-slate-400" aria-hidden>
                    <ChevronRight size={22} strokeWidth={2.25} className="shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

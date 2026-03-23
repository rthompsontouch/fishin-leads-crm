import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listJobs } from '../features/jobs/api/jobsApi'

export default function JobsPage() {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')
  const [search, setSearch] = useState('')

  const { data, isPending, error } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => listJobs(),
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter((job) => {
      if (filter === 'scheduled' && job.status !== 'Scheduled') return false
      if (filter === 'completed' && job.status !== 'Completed') return false
      if (!q) return true
      const haystack = [
        job.customer?.name ?? '',
        job.notes ?? '',
        job.quote?.description ?? '',
        job.status,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [data, filter, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm opacity-80 mt-1">Track upcoming and completed jobs.</p>
        </div>
      </div>

      <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap gap-2">
          {(['all', 'scheduled', 'completed'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1 text-xs font-semibold border cursor-pointer transition-colors duration-150 ${
                filter === value
                  ? 'bg-[color:var(--color-primary)] text-white border-transparent hover:bg-[color:var(--color-primary-dark)]'
                  : 'border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]'
              }`}
            >
              {value === 'all' ? 'All' : value === 'scheduled' ? 'Scheduled' : 'Completed'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="w-full rounded-md border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--color-border)' }}
        />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="grid grid-cols-5 bg-[color:var(--color-surface-1)] p-3 text-xs font-semibold">
          <div>Customer</div>
          <div>Scheduled</div>
          <div>Status</div>
          <div>Quote</div>
          <div>Action</div>
        </div>

        {isPending ? (
          <div className="p-6 text-sm opacity-80">Loading jobs...</div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load jobs. {String((error as Error).message)}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm opacity-80">No jobs found.</div>
        ) : (
          <div className="flex flex-col">
            {rows.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-5 gap-2 px-3 py-3 items-center border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="truncate text-sm font-semibold">{job.customer?.name ?? '—'}</div>
                <div className="truncate text-sm opacity-90">{job.scheduled_date}</div>
                <div className="truncate text-sm opacity-80">{job.status}</div>
                <div className="truncate text-sm opacity-80">
                  {job.quote ? `${job.quote.price_currency} ${job.quote.price_amount}` : '—'}
                </div>
                <div>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="rounded-md px-2 py-1 text-xs font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] no-underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCustomers } from '../features/customers/api/customersApi'
import { listLeads } from '../features/leads/api/leadsApi'
import { listUpcomingJobs } from '../features/jobs/api/jobsApi'

export default function DashboardPage() {
  const {
    data: leads,
    isPending: leadsPending,
    error: leadsError,
  } = useQuery({
    queryKey: ['leads'],
    queryFn: () => listLeads(),
  })

  const {
    data: customers,
    isPending: customersPending,
    error: customersError,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers(),
  })

  const {
    data: upcomingJobs,
    isPending: jobsPending,
    error: jobsError,
  } = useQuery({
    queryKey: ['jobs-upcoming'],
    queryFn: () => listUpcomingJobs(),
  })

  const totalLeads = leads?.length ?? 0
  const uncontactedLeads =
    leads?.filter((l) => l.last_contacted_at === null).length ?? 0
  const totalCustomers = customers?.length ?? 0
  const nowIso = new Date().toISOString()
  const dueReminders =
    upcomingJobs?.filter(
      (j) =>
        j.reminder_at &&
        !j.reminder_sent_at &&
        new Date(j.reminder_at).toISOString() <= nowIso,
    ).length ?? 0

  const loading = leadsPending || customersPending || jobsPending
  const error = leadsError || customersError || jobsError

  const fmt = (n: number) => (loading ? '…' : error ? '—' : String(n))

  const primaryBtn =
    'rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]'
  const outlineBtn =
    'rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]'

  return (
    <div className="flex flex-col gap-6 max-md:pt-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm opacity-80 mt-1">Quick overview of your CRM.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/leads/new" className={primaryBtn}>
            Add Lead
          </Link>
          <Link to="/customers/new" className={outlineBtn}>
            Add Customer
          </Link>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
        >
          Couldn&apos;t load dashboard data. {String((error as Error).message)}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/leads"
          className="rounded-xl border p-4 transition-colors hover:bg-[color:var(--color-surface-1)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-sm opacity-80">Total leads</div>
          <div className="text-2xl font-bold mt-2">{fmt(totalLeads)}</div>
          <div className="text-xs opacity-60 mt-2">View leads →</div>
        </Link>
        <Link
          to="/leads?filter=uncontacted"
          className="rounded-xl border p-4 transition-colors hover:bg-[color:var(--color-surface-1)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-sm opacity-80">Uncontacted leads</div>
          <div className="text-2xl font-bold mt-2">{fmt(uncontactedLeads)}</div>
          <div className="text-xs opacity-60 mt-2">Review pipeline →</div>
        </Link>
        <Link
          to="/customers"
          className="rounded-xl border p-4 transition-colors hover:bg-[color:var(--color-surface-1)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-sm opacity-80">Total customers</div>
          <div className="text-2xl font-bold mt-2">{fmt(totalCustomers)}</div>
          <div className="text-xs opacity-60 mt-2">View customers →</div>
        </Link>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="text-sm font-semibold">Shortcuts</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/integrations/leads" className={outlineBtn}>
            Integrations
          </Link>
          <Link to="/settings" className={outlineBtn}>
            Settings
          </Link>
        </div>
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-semibold">Upcoming jobs</div>
          <div className="text-xs opacity-70">
            {jobsPending ? 'Loading…' : dueReminders > 0 ? `${dueReminders} reminder(s) due` : 'No reminders due'}
          </div>
        </div>

        {jobsError ? (
          <div className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            Failed to load jobs: {String((jobsError as Error).message)}
          </div>
        ) : jobsPending ? (
          <div className="text-sm opacity-80 mt-3">Loading jobs…</div>
        ) : upcomingJobs && upcomingJobs.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {upcomingJobs.slice(0, 7).map((j) => (
              <Link
                key={j.id}
                to={`/jobs/${j.id}`}
                className="rounded-md border px-3 py-2 text-sm flex items-start justify-between gap-3 hover:bg-[color:var(--color-surface-1)]"
                style={{ borderColor: 'var(--color-border)', textDecoration: 'none' }}
              >
                <div className="min-w-0">
                  <div className="font-semibold">Job • {j.scheduled_date}</div>
                  <div className="text-xs opacity-70">
                    {j.is_recurring
                      ? `Recurring (${j.recurrence_unit ?? 'weekly'})`
                      : 'One-time'}
                  </div>
                </div>
                <div className="text-xs opacity-80 whitespace-nowrap">
                  {j.reminder_at && !j.reminder_sent_at ? 'Reminder due' : ' '}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm opacity-80 mt-3">No upcoming jobs.</div>
        )}
      </div>
    </div>
  )
}

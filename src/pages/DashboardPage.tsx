import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Calendar, Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import DashboardCharts from '../features/dashboard/components/DashboardCharts'
import {
  listCustomers,
  listServiceEntriesForOwner,
} from '../features/customers/api/customersApi'
import { listLeads, listLeadsPaged } from '../features/leads/api/leadsApi'
import { listUpcomingJobs } from '../features/jobs/api/jobsApi'
import {
  listQuotesForDashboard,
  type DashboardQuoteRow,
} from '../features/quotes/api/quotesApi'
import {
  createdAtInRange,
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardStatsPeriod,
  eventInPeriod,
  formatLocalYmd,
  getPeriodRange,
  getPreviousPeriodRange,
  scheduledDateInRange,
} from '../lib/dashboardPeriods'

function quoteOutcomeInPeriod(
  q: DashboardQuoteRow,
  range: { start: Date; end: Date } | null,
): 'won' | 'lost' | null {
  if (!range) {
    if (q.status === 'Won') return 'won'
    if (q.status === 'Lost') return 'lost'
    return null
  }
  if (q.status === 'Won') {
    const ts = q.won_at ?? q.updated_at
    return eventInPeriod(ts, range) ? 'won' : null
  }
  if (q.status === 'Lost') {
    const ts = q.lost_at ?? q.updated_at
    return eventInPeriod(ts, range) ? 'lost' : null
  }
  return null
}

export default function DashboardPage() {
  const [statsPeriod, setStatsPeriod] = useState<DashboardStatsPeriod>('week')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)

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
    data: recentNotificationLeads,
    isPending: notificationsPending,
  } = useQuery({
    queryKey: ['dashboard-notification-leads'],
    queryFn: async () => {
      const page = await listLeadsPaged({ page: 1, pageSize: 6 })
      return page.rows
    },
    refetchInterval: 60_000,
  })

  const {
    data: upcomingJobs,
    isPending: jobsPending,
    error: jobsError,
  } = useQuery({
    queryKey: ['jobs-upcoming'],
    queryFn: () => listUpcomingJobs(),
  })

  const {
    data: quotes,
    isPending: quotesPending,
    error: quotesError,
  } = useQuery({
    queryKey: ['quotes-dashboard'],
    queryFn: () => listQuotesForDashboard(),
  })

  const {
    data: serviceEntries,
    isPending: servicesPending,
    error: servicesError,
  } = useQuery({
    queryKey: ['service-entries-dashboard'],
    queryFn: () => listServiceEntriesForOwner(),
  })

  const range = useMemo(() => getPeriodRange(statsPeriod), [statsPeriod])
  const prevRange = useMemo(() => getPreviousPeriodRange(statsPeriod), [statsPeriod])

  const chartMetrics = useMemo(() => {
    const L = leads ?? []
    const Q = quotes ?? []
    const S = serviceEntries ?? []

    const conversionsThis = L.filter(
      (l) => l.converted_at && eventInPeriod(l.converted_at, range),
    ).length
    const conversionsPrev = prevRange
      ? L.filter((l) => l.converted_at && eventInPeriod(l.converted_at, prevRange)).length
      : 0

    const newLeadsThis = L.filter((l) => createdAtInRange(l.created_at, range)).length
    const newLeadsPrev = prevRange
      ? L.filter((l) => createdAtInRange(l.created_at, prevRange)).length
      : 0

    let quotesWon = 0
    let quotesLost = 0
    for (const q of Q) {
      const o = quoteOutcomeInPeriod(q, range)
      if (o === 'won') quotesWon += 1
      if (o === 'lost') quotesLost += 1
    }

    const servicesThis = S.filter((s) => eventInPeriod(s.created_at, range)).length
    const servicesPrev = prevRange
      ? S.filter((s) => eventInPeriod(s.created_at, prevRange)).length
      : 0

    return {
      conversionsThis,
      conversionsPrev,
      newLeadsThis,
      newLeadsPrev,
      quotesWon,
      quotesLost,
      servicesThis,
      servicesPrev,
    }
  }, [leads, quotes, serviceEntries, range, prevRange])

  const filteredLeads = useMemo(
    () => (leads ?? []).filter((l) => createdAtInRange(l.created_at, range)),
    [leads, range],
  )

  const filteredCustomers = useMemo(
    () => (customers ?? []).filter((c) => createdAtInRange(c.created_at, range)),
    [customers, range],
  )

  const filteredJobs = useMemo(
    () => (upcomingJobs ?? []).filter((j) => scheduledDateInRange(j.scheduled_date, range)),
    [upcomingJobs, range],
  )

  const totalLeads = filteredLeads.length
  const uncontactedLeads = filteredLeads.filter((l) => l.last_contacted_at === null).length
  const totalCustomers = filteredCustomers.length
  const nowIso = new Date().toISOString()
  const dueReminders = filteredJobs.filter(
    (j) =>
      j.reminder_at &&
      !j.reminder_sent_at &&
      new Date(j.reminder_at).toISOString() <= nowIso,
  ).length

  const loading = leadsPending || customersPending || jobsPending
  const error = leadsError || customersError || jobsError
  const chartsLoading = leadsPending || quotesPending || servicesPending

  const fmt = (n: number) => (loading ? '…' : error ? '—' : String(n))

  const periodLabel =
    DASHBOARD_PERIOD_OPTIONS.find((o) => o.value === statsPeriod)?.label ?? statsPeriod

  const exportStats = () => {
    const lines = [
      ['Period', periodLabel],
      ['Total leads', String(totalLeads)],
      ['Uncontacted leads', String(uncontactedLeads)],
      ['Total customers', String(totalCustomers)],
      ['Upcoming jobs (in period)', String(filteredJobs.length)],
      ['Reminders due (in period)', String(dueReminders)],
      ['Conversions (period)', String(chartMetrics.conversionsThis)],
      ['Conversions (prior period)', String(chartMetrics.conversionsPrev)],
      ['New leads (period)', String(chartMetrics.newLeadsThis)],
      ['New leads (prior period)', String(chartMetrics.newLeadsPrev)],
      ['Quotes won (period)', String(chartMetrics.quotesWon)],
      ['Quotes lost (period)', String(chartMetrics.quotesLost)],
      ['Services logged (period)', String(chartMetrics.servicesThis)],
      ['Services logged (prior period)', String(chartMetrics.servicesPrev)],
      ['Exported at', new Date().toISOString()],
    ]
    const csv = lines.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-stats-${statsPeriod}-${formatLocalYmd(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const periodPickerClass =
    'min-w-[9.5rem] flex-1 rounded-sm py-1.5 pl-1 pr-8 text-sm font-semibold cursor-pointer outline-none ' +
    'border-0 bg-transparent transition-opacity duration-150 appearance-none bg-[length:1rem] bg-[right_0.35rem_center] bg-no-repeat ' +
    'focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 ' +
    'hover:opacity-90'

  const exportBtnClass =
    'crm-dashboard-export-stats inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer'

  const nowTs = Date.now()
  const notificationLeads = (recentNotificationLeads ?? []).slice(0, 4)
  const notificationJobs = (upcomingJobs ?? []).slice(0, 4)
  const dueReminderCount = notificationJobs.filter((job) => {
    if (!job.reminder_at || job.reminder_sent_at) return false
    return new Date(job.reminder_at).getTime() <= nowTs
  }).length
  const freshLeadCount = notificationLeads.filter(
    (lead) => nowTs - new Date(lead.created_at).getTime() <= 24 * 60 * 60 * 1000,
  ).length
  const notificationBadgeCount = freshLeadCount + dueReminderCount

  useEffect(() => {
    if (!isNotificationsOpen) return
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (!notificationsRef.current?.contains(target)) {
        setIsNotificationsOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNotificationsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsOpen])

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <h1 className="crm-page-header-title">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="crm-dashboard-period-field inline-flex items-center gap-2 rounded-sm border-2 px-2 py-0.5 transition-opacity hover:opacity-95"
            style={{
              borderColor: 'var(--crm-content-header-text)',
              backgroundColor: 'transparent',
            }}
          >
            <Calendar
              size={18}
              className="shrink-0 pointer-events-none"
              style={{ color: 'var(--crm-content-header-text)' }}
              aria-hidden
            />
            <select
              id="dashboard-stats-period"
              aria-label="Stats period"
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value as DashboardStatsPeriod)}
              className={periodPickerClass}
              style={{
                color: 'var(--crm-content-header-text)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              }}
            >
              {DASHBOARD_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={exportBtnClass} onClick={exportStats}>
            Export stats
            <Download size={18} className="shrink-0 opacity-95" aria-hidden />
          </button>
          <div ref={notificationsRef} className="relative max-md:hidden">
            <button
              type="button"
              className="crm-dashboard-export-stats relative inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer"
              onClick={() => setIsNotificationsOpen((v) => !v)}
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
              title="Notifications"
            >
              <Bell size={18} className="shrink-0 opacity-95" aria-hidden />
              Notifications
              {notificationBadgeCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none text-white"
                  style={{ background: 'var(--color-danger)' }}
                >
                  {notificationBadgeCount > 9 ? '9+' : notificationBadgeCount}
                </span>
              ) : null}
            </button>
            {isNotificationsOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+0.45rem)] z-30 w-80 rounded-xl border bg-white p-3 shadow-xl"
                style={{ borderColor: 'var(--color-border)', color: 'var(--crm-content-header-text)' }}
              >
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="text-sm font-semibold">Notifications</div>
                  {(notificationBadgeCount > 0 || notificationsPending) && (
                    <div className="text-xs text-slate-500">
                      {notificationsPending ? 'Refreshing...' : `${notificationBadgeCount} new`}
                    </div>
                  )}
                </div>
                <div className="max-h-[55dvh] space-y-2 overflow-y-auto pr-1 crm-scrollbar">
                  {notificationLeads.map((lead) => (
                    <Link
                      key={`dashboard-lead-${lead.id}`}
                      to={`/leads/${lead.id}`}
                      className="block rounded-lg border px-3 py-2.5 text-sm no-underline transition-colors hover:bg-slate-50"
                      style={{ borderColor: 'hsl(215 20% 88%)', color: 'inherit' }}
                      onClick={() => setIsNotificationsOpen(false)}
                    >
                      <div className="font-semibold">Incoming lead</div>
                      <div className="text-xs text-slate-600 truncate">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
                          lead.company ||
                          'New lead'}
                      </div>
                    </Link>
                  ))}
                  {notificationJobs.map((job) => (
                    <Link
                      key={`dashboard-job-${job.id}`}
                      to={`/jobs/${job.id}`}
                      className="block rounded-lg border px-3 py-2.5 text-sm no-underline transition-colors hover:bg-slate-50"
                      style={{ borderColor: 'hsl(215 20% 88%)', color: 'inherit' }}
                      onClick={() => setIsNotificationsOpen(false)}
                    >
                      <div className="font-semibold">
                        {job.reminder_at && !job.reminder_sent_at && new Date(job.reminder_at).getTime() <= nowTs
                          ? 'Job reminder due'
                          : 'Upcoming job'}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        Scheduled for {job.scheduled_date}
                      </div>
                    </Link>
                  ))}
                  {!notificationsPending && notificationLeads.length === 0 && notificationJobs.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
                      No new notifications right now.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
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

      <div className="flex flex-col gap-1">
        <p
          className="text-xs leading-snug m-0"
          style={{ color: 'var(--crm-content-header-text)' }}
        >
          Metrics below use <span className="font-semibold">{periodLabel}</span>
          {statsPeriod === 'all'
            ? ' (all records).'
            : ' (by created date for leads & customers; scheduled date for upcoming jobs).'}
        </p>

        <div
          className="rounded-xl overflow-hidden shadow-md ring-1 ring-white/10"
          style={{
            background:
              'linear-gradient(160deg, var(--crm-sidebar-links-bg) 0%, var(--crm-shell-bg) 100%)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3">
            <Link
              to="/leads"
              className="block px-6 py-5 md:py-6 text-white no-underline outline-none transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary-light)]"
            >
              <div className="text-sm font-medium text-white/75">Total leads</div>
              <div className="text-2xl font-bold mt-2 tabular-nums text-white">{fmt(totalLeads)}</div>
              <div className="text-xs mt-2 text-white/55">View leads →</div>
            </Link>
            <Link
              to="/leads?filter=uncontacted"
              className="block px-6 py-5 md:py-6 text-white no-underline outline-none transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary-light)]"
            >
              <div className="text-sm font-medium text-white/75">Uncontacted leads</div>
              <div className="text-2xl font-bold mt-2 tabular-nums text-white">{fmt(uncontactedLeads)}</div>
              <div className="text-xs mt-2 text-white/55">Review pipeline →</div>
            </Link>
            <Link
              to="/customers"
              className="block px-6 py-5 md:py-6 text-white no-underline outline-none transition-colors duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-primary-light)]"
            >
              <div className="text-sm font-medium text-white/75">Total customers</div>
              <div className="text-2xl font-bold mt-2 tabular-nums text-white">{fmt(totalCustomers)}</div>
              <div className="text-xs mt-2 text-white/55">View customers →</div>
            </Link>
          </div>
        </div>
      </div>

      {quotesError || servicesError ? (
        <div className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {quotesError ? `Charts (quotes): ${String((quotesError as Error).message)}. ` : null}
          {servicesError ? `Charts (services): ${String((servicesError as Error).message)}.` : null}
        </div>
      ) : null}

      <DashboardCharts
        period={statsPeriod}
        loading={chartsLoading}
        conversionsThis={chartMetrics.conversionsThis}
        conversionsPrev={chartMetrics.conversionsPrev}
        newLeadsThis={chartMetrics.newLeadsThis}
        newLeadsPrev={chartMetrics.newLeadsPrev}
        quotesWon={chartMetrics.quotesWon}
        quotesLost={chartMetrics.quotesLost}
        servicesThis={chartMetrics.servicesThis}
        servicesPrev={chartMetrics.servicesPrev}
      />

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Upcoming jobs
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--crm-content-header-text)', opacity: 0.75 }}
          >
            {jobsPending ? 'Loading…' : dueReminders > 0 ? `${dueReminders} reminder(s) due` : 'No reminders due'}
          </div>
        </div>

        {jobsError ? (
          <div className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            Failed to load jobs: {String((jobsError as Error).message)}
          </div>
        ) : jobsPending ? (
          <div
            className="text-sm mt-3"
            style={{ color: 'var(--crm-content-header-text)', opacity: 0.8 }}
          >
            Loading jobs…
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {filteredJobs.slice(0, 7).map((j) => (
              <Link
                key={j.id}
                to={`/jobs/${j.id}`}
                className="rounded-md px-3 py-2.5 text-sm flex items-start justify-between gap-3 no-underline outline-none transition-colors duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 shadow-sm ring-1 ring-white/10"
                style={{
                  background:
                    'linear-gradient(160deg, var(--crm-sidebar-links-bg) 0%, var(--crm-shell-bg) 100%)',
                  color: '#fff',
                }}
              >
                <div className="min-w-0 text-white">
                  <div className="font-semibold">Job • {j.scheduled_date}</div>
                  <div className="text-xs text-white/70">
                    {j.is_recurring
                      ? `Recurring (${j.recurrence_unit ?? 'weekly'})`
                      : 'One-time'}
                  </div>
                </div>
                <div className="text-xs text-white/80 whitespace-nowrap">
                  {j.reminder_at && !j.reminder_sent_at ? 'Reminder due' : '\u00a0'}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className="text-sm mt-3"
            style={{ color: 'var(--crm-content-header-text)', opacity: 0.8 }}
          >
            No upcoming jobs in this period.
          </div>
        )}
      </div>
    </div>
  )
}

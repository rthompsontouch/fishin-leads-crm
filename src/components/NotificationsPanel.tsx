import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  isJobReminderDueNotification,
  isLeadNewForNotification,
  notificationJobKey,
  notificationLeadKey,
} from '../lib/notificationReadState'

type LeadMini = {
  id: string
  created_at: string
  first_name: string | null
  last_name: string | null
  company: string | null
}

type JobMini = {
  id: string
  scheduled_date: string
  reminder_at: string | null
  reminder_sent_at: string | null
}

export default function NotificationsPanel({
  leads,
  jobs,
  reads,
  nowTs,
  onMarkRead,
  onNavigate,
  pending,
}: {
  leads: LeadMini[]
  jobs: JobMini[]
  reads: Set<string>
  nowTs: number
  onMarkRead: (key: string) => void
  onNavigate?: () => void
  pending: boolean
}) {
  const rows: Array<{ key: string; el: ReactNode }> = []

  for (const lead of leads) {
    const k = notificationLeadKey(lead.id)
    const isNew = isLeadNewForNotification(lead.created_at, nowTs)
    const unread = isNew && !reads.has(k)
    const label =
      [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || 'New lead'
    rows.push({
      key: k,
      el: (
        <Link
          to={`/leads/${lead.id}`}
          className={[
            'block px-3 py-3 text-sm no-underline transition-colors hover:bg-slate-100',
            unread ? 'bg-slate-50' : '',
          ].join(' ')}
          style={{ color: 'var(--crm-content-header-text)' }}
          onClick={() => {
            onMarkRead(k)
            onNavigate?.()
          }}
        >
          <div className={unread ? 'font-bold' : 'font-semibold'}>Incoming lead</div>
          <div className={`text-xs truncate mt-0.5 ${unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
            {label}
          </div>
        </Link>
      ),
    })
  }

  for (const job of jobs) {
    const k = notificationJobKey(job.id)
    const due = isJobReminderDueNotification(job, nowTs)
    const unread = due && !reads.has(k)
    const title =
      due && job.reminder_at && !job.reminder_sent_at ? 'Job reminder due' : 'Upcoming job'
    rows.push({
      key: k,
      el: (
        <Link
          to={`/jobs/${job.id}`}
          className={[
            'block px-3 py-3 text-sm no-underline transition-colors hover:bg-slate-100',
            unread ? 'bg-slate-50' : '',
          ].join(' ')}
          style={{ color: 'var(--crm-content-header-text)' }}
          onClick={() => {
            onMarkRead(k)
            onNavigate?.()
          }}
        >
          <div className={unread ? 'font-bold' : 'font-semibold'}>{title}</div>
          <div className={`text-xs truncate mt-0.5 ${unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
            Scheduled for {job.scheduled_date}
          </div>
        </Link>
      ),
    })
  }

  if (!pending && rows.length === 0) {
    return <div className="px-3 py-4 text-sm text-slate-600">No notifications right now.</div>
  }

  return (
    <div className="divide-y divide-slate-200 max-h-[55dvh] overflow-y-auto crm-scrollbar">
      {pending && rows.length === 0 ? (
        <div className="px-3 py-4 text-sm text-slate-500">Loading…</div>
      ) : null}
      {rows.map((r) => (
        <div key={r.key}>{r.el}</div>
      ))}
    </div>
  )
}

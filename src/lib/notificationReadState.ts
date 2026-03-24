import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'crm-notification-reads-v1'

function loadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { reads?: string[] }
    return new Set(parsed.reads ?? [])
  } catch {
    return new Set()
  }
}

function persistSet(next: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ reads: [...next] }))
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('crm-notification-reads-changed'))
}

export function markNotificationRead(key: string) {
  const next = loadSet()
  next.add(key)
  persistSet(next)
}

export function useNotificationReads() {
  const [reads, setReads] = useState(() => loadSet())

  useEffect(() => {
    const sync = () => setReads(loadSet())
    window.addEventListener('crm-notification-reads-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('crm-notification-reads-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const markRead = useCallback((key: string) => {
    const next = loadSet()
    next.add(key)
    persistSet(next)
    setReads(next)
  }, [])

  return { reads, markRead }
}

const DAY_MS = 24 * 60 * 60 * 1000

export function isLeadNewForNotification(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() <= DAY_MS
}

export function isJobReminderDueNotification(
  job: { reminder_at: string | null; reminder_sent_at: string | null },
  nowTs: number,
): boolean {
  if (!job.reminder_at || job.reminder_sent_at) return false
  return new Date(job.reminder_at).getTime() <= nowTs
}

export function notificationLeadKey(leadId: string) {
  return `lead:${leadId}`
}

export function notificationJobKey(jobId: string) {
  return `job:${jobId}`
}

export function countUnreadNotifications(
  reads: Set<string>,
  leads: { id: string; created_at: string }[],
  jobs: { id: string; reminder_at: string | null; reminder_sent_at: string | null }[],
  nowTs: number,
): number {
  let c = 0
  for (const lead of leads) {
    if (isLeadNewForNotification(lead.created_at, nowTs) && !reads.has(notificationLeadKey(lead.id))) {
      c++
    }
  }
  for (const job of jobs) {
    if (isJobReminderDueNotification(job, nowTs) && !reads.has(notificationJobKey(job.id))) {
      c++
    }
  }
  return c
}

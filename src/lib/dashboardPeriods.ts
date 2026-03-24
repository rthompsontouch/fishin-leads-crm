export const DASHBOARD_PERIOD_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
] as const

export type DashboardStatsPeriod = (typeof DASHBOARD_PERIOD_OPTIONS)[number]['value']

export function startOfWeekMonday(reference: Date): Date {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getPeriodRange(period: DashboardStatsPeriod): { start: Date; end: Date } | null {
  if (period === 'all') return null
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  if (period === 'week') {
    return { start: startOfWeekMonday(now), end }
  }
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end,
    }
  }
  if (period === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end,
    }
  }
  return null
}

/** Previous full calendar week / month / year (no "all time"). */
export function getPreviousPeriodRange(
  period: DashboardStatsPeriod,
): { start: Date; end: Date } | null {
  if (period === 'all') return null
  const now = new Date()
  if (period === 'week') {
    const thisWeekStart = startOfWeekMonday(now)
    const endPrev = new Date(thisWeekStart.getTime() - 1)
    endPrev.setHours(23, 59, 59, 999)
    const startPrev = startOfWeekMonday(endPrev)
    return { start: startPrev, end: endPrev }
  }
  if (period === 'month') {
    const firstThis = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endPrev = new Date(firstThis.getTime() - 1)
    endPrev.setHours(23, 59, 59, 999)
    const startPrev = new Date(endPrev.getFullYear(), endPrev.getMonth(), 1, 0, 0, 0, 0)
    return { start: startPrev, end: endPrev }
  }
  if (period === 'year') {
    const firstThis = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    const endPrev = new Date(firstThis.getTime() - 1)
    endPrev.setHours(23, 59, 59, 999)
    const startPrev = new Date(endPrev.getFullYear(), 0, 1, 0, 0, 0, 0)
    return { start: startPrev, end: endPrev }
  }
  return null
}

export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Event timestamp falls in range; if range is null (all time), any non-null iso matches. */
export function eventInPeriod(iso: string | null | undefined, range: { start: Date; end: Date } | null): boolean {
  if (!iso) return false
  if (!range) return true
  const t = new Date(iso).getTime()
  return t >= range.start.getTime() && t <= range.end.getTime()
}

export function createdAtInRange(
  createdAt: string,
  range: { start: Date; end: Date } | null,
): boolean {
  return eventInPeriod(createdAt, range)
}

export function scheduledDateInRange(
  scheduledDate: string,
  range: { start: Date; end: Date } | null,
): boolean {
  if (!range) return true
  const ymdStart = formatLocalYmd(range.start)
  const ymdEnd = formatLocalYmd(range.end)
  return scheduledDate >= ymdStart && scheduledDate <= ymdEnd
}

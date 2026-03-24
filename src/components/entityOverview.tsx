import type { ReactNode } from 'react'

/** Grouped block with subtle header + bordered rows */
export function OverviewBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-0.5">
        {title}
      </h3>
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        {children}
      </div>
    </section>
  )
}

export function OverviewRow({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  /** e.g. sm:col-span-2 for full-width rows */
  className?: string
}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-[minmax(7.5rem,10rem)_1fr] gap-x-5 gap-y-1 px-4 py-3 border-b border-slate-200 last:border-b-0 items-start bg-slate-50/90 ${className}`}
    >
      <div className="text-xs font-semibold text-slate-500 pt-0.5">{label}</div>
      <div className="text-sm min-w-0 break-words text-slate-800">{children}</div>
    </div>
  )
}

export function OverviewLink({
  href,
  children,
  target,
  rel,
}: {
  href: string
  children: ReactNode
  target?: string
  rel?: string
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="font-medium text-[color:var(--color-primary)] hover:underline underline-offset-2 break-all"
    >
      {children}
    </a>
  )
}

/** Optional pill for status / tags */
export function OverviewPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
}) {
  const color =
    tone === 'success'
      ? 'var(--color-success)'
      : tone === 'info'
        ? 'var(--color-info)'
        : tone === 'warning'
          ? 'var(--color-accent)'
          : tone === 'danger'
            ? 'var(--color-danger)'
            : 'var(--color-primary)'

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        color,
        background: 'color-mix(in srgb, currentColor 12%, transparent)',
        border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {children}
    </span>
  )
}

export function leadStatusTone(
  status: string,
): 'neutral' | 'success' | 'info' | 'warning' | 'danger' {
  if (status === 'Won') return 'success'
  if (status === 'Lost') return 'danger'
  if (status === 'Quoted') return 'info'
  if (status === 'New') return 'info'
  if (status === 'Contacted') return 'neutral'
  return 'warning'
}

export function customerStatusTone(
  status: string,
): 'neutral' | 'success' | 'info' | 'warning' | 'danger' {
  if (status === 'Active') return 'success'
  if (status === 'Prospect') return 'info'
  if (status === 'Churned') return 'danger'
  return 'neutral'
}

export function websiteHref(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

/** Compact stats row inside an OverviewBlock (no row dividers). */
export function OverviewStatGrid({
  stats,
}: {
  stats: { label: string; value: ReactNode }[]
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 px-4 py-4 bg-slate-50/90">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {s.label}
          </div>
          <div className="text-lg font-semibold tabular-nums mt-1 text-slate-900">{s.value}</div>
        </div>
      ))}
    </div>
  )
}

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
      <h3 className="text-[11px] font-semibold uppercase tracking-wider opacity-50 px-0.5">
        {title}
      </h3>
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
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
      className={`grid grid-cols-1 sm:grid-cols-[minmax(7.5rem,10rem)_1fr] gap-x-5 gap-y-1 px-4 py-3 border-b last:border-b-0 items-start ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        background: 'color-mix(in srgb, var(--color-surface-1) 55%, transparent)',
      }}
    >
      <div className="text-xs font-semibold text-[color:var(--color-foreground)] opacity-60 pt-0.5">
        {label}
      </div>
      <div className="text-sm min-w-0 break-words text-[color:var(--color-foreground)]">
        {children}
      </div>
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
): 'neutral' | 'success' | 'info' | 'warning' {
  if (status === 'Qualified') return 'success'
  if (status === 'New') return 'info'
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
    <div
      className="grid grid-cols-2 sm:grid-cols-3 gap-6 px-4 py-4"
      style={{
        background: 'color-mix(in srgb, var(--color-surface-1) 55%, transparent)',
      }}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-50">
            {s.label}
          </div>
          <div className="text-lg font-semibold tabular-nums mt-1">{s.value}</div>
        </div>
      ))}
    </div>
  )
}

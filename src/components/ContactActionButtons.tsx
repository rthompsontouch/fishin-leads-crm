import { Mail, Phone } from 'lucide-react'

const linkClass =
  'crm-contact-link crm-contact-link--dark inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--crm-sidebar-links-bg)]'

/** Tighter pills for table cells (mobile + desktop). */
const linkClassTable =
  'crm-contact-link crm-contact-link--dark inline-flex items-center gap-1.5 rounded-md px-3 py-2 min-h-10 min-w-[4.25rem] justify-center text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--color-background)] whitespace-nowrap shrink-0'

/** Build `tel:` href from stored phone (digits and leading + kept). */
export function telHref(phone: string | null | undefined): string | null {
  const raw = phone?.trim()
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return null
  return `tel:${digits}`
}

export function mailtoHref(email: string | null | undefined, subject?: string): string | null {
  const e = email?.trim()
  if (!e) return null
  const s = subject?.trim()
  if (s) return `mailto:${e}?subject=${encodeURIComponent(s)}`
  return `mailto:${e}`
}

export function CallLinkCell({
  phone,
  className = '',
}: {
  phone?: string | null
  className?: string
}) {
  const tel = telHref(phone)
  if (!tel) {
    return <span className={`text-base text-slate-400 tabular-nums ${className}`.trim()}>—</span>
  }
  return (
    <a href={tel} className={`${linkClassTable} ${className}`.trim()}>
      <Phone size={16} className="shrink-0 opacity-80" aria-hidden />
      Call
    </a>
  )
}

export function EmailLinkCell({
  email,
  contactLabel,
  className = '',
}: {
  email?: string | null
  contactLabel?: string
  className?: string
}) {
  const mail = mailtoHref(email, contactLabel ? `Re: ${contactLabel}` : undefined)
  if (!mail) {
    return <span className={`text-base text-slate-400 ${className}`.trim()}>—</span>
  }
  return (
    <a href={mail} className={`${linkClassTable} ${className}`.trim()}>
      <Mail size={16} className="shrink-0 opacity-90" aria-hidden />
      Email
    </a>
  )
}

type ContactActionButtonsProps = {
  phone?: string | null
  email?: string | null
  /** Used as email subject prefix */
  contactLabel?: string
  className?: string
}

export default function ContactActionButtons({
  phone,
  email,
  contactLabel,
  className = '',
}: ContactActionButtonsProps) {
  const tel = telHref(phone)
  const mail = mailtoHref(email, contactLabel ? `Re: ${contactLabel}` : undefined)
  if (!tel && !mail) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {tel ? (
        <a href={tel} className={linkClass}>
          <Phone size={14} className="shrink-0 opacity-80" aria-hidden />
          Call
        </a>
      ) : null}
      {mail ? (
        <a href={mail} className={linkClass}>
          <Mail size={14} className="shrink-0 opacity-90" aria-hidden />
          Email
        </a>
      ) : null}
    </div>
  )
}

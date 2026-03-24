import { Mail, Phone } from 'lucide-react'

const linkClass =
  'crm-contact-link crm-contact-link--dark inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--crm-sidebar-links-bg)]'

/** Tighter pills for table cells (mobile + desktop). */
const linkClassTable =
  'crm-contact-link crm-contact-link--dark inline-flex items-center gap-1.5 rounded-md px-3 py-2 min-h-10 min-w-[4.25rem] justify-center text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--color-background)] whitespace-nowrap shrink-0'

/** Icon-only on small screens (Leads table mobile). */
const linkClassTableIconOnly =
  'crm-contact-link crm-contact-link--dark inline-flex items-center justify-center rounded-md max-md:w-full max-md:min-h-11 max-md:min-w-0 max-md:px-2 min-h-10 min-w-10 md:min-h-10 md:w-auto md:min-w-[4.25rem] md:gap-1.5 md:px-3 md:py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--color-background)] shrink-0'

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
  iconOnlyMobile,
}: {
  phone?: string | null
  className?: string
  /** Hide “Call” label below `md`; icon + aria-label only */
  iconOnlyMobile?: boolean
}) {
  const tel = telHref(phone)
  if (!tel) {
    return <span className={`text-base text-slate-400 tabular-nums ${className}`.trim()}>—</span>
  }
  const base = iconOnlyMobile ? linkClassTableIconOnly : linkClassTable
  return (
    <a href={tel} className={`${base} ${className}`.trim()} aria-label={`Call ${phone ?? ''}`.trim()}>
      <Phone size={16} className="shrink-0 opacity-80" aria-hidden />
      {iconOnlyMobile ? <span className="hidden md:inline">Call</span> : <span>Call</span>}
    </a>
  )
}

export function EmailLinkCell({
  email,
  contactLabel,
  className = '',
  iconOnlyMobile,
}: {
  email?: string | null
  contactLabel?: string
  className?: string
  iconOnlyMobile?: boolean
}) {
  const mail = mailtoHref(email, contactLabel ? `Re: ${contactLabel}` : undefined)
  if (!mail) {
    return <span className={`text-base text-slate-400 ${className}`.trim()}>—</span>
  }
  const base = iconOnlyMobile ? linkClassTableIconOnly : linkClassTable
  const label = email?.trim() ? `Email ${email.trim()}` : 'Email'
  return (
    <a href={mail} className={`${base} ${className}`.trim()} aria-label={label}>
      <Mail size={16} className="shrink-0 opacity-90" aria-hidden />
      {iconOnlyMobile ? <span className="hidden md:inline">Email</span> : <span>Email</span>}
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

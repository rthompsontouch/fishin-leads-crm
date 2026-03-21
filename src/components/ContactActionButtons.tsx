import { Mail, Phone } from 'lucide-react'

const linkClass =
  'crm-contact-link inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold border transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]'

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
          <Mail size={14} className="shrink-0 opacity-80" aria-hidden />
          Email
        </a>
      ) : null}
    </div>
  )
}

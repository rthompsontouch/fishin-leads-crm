/** Public domains where a company logo lookup is not meaningful. */
const CONSUMER_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'pm.me',
  'yandex.com',
  'mail.ru',
  'gmx.com',
  'gmx.net',
  'hey.com',
  'fastmail.com',
])

function extractDomain(email: string): string | null {
  const t = email.trim().toLowerCase()
  const at = t.lastIndexOf('@')
  if (at < 1 || at === t.length - 1) return null
  return t.slice(at + 1)
}

/**
 * Best-effort brand mark for login: favicon for the email domain (skips common consumer hosts).
 * Not tied to CRM profile data; works for any corporate domain.
 */
export function getLoginBrandLogoCandidates(email: string): string[] {
  const domain = extractDomain(email)
  if (!domain || CONSUMER_EMAIL_DOMAINS.has(domain)) return []
  const enc = encodeURIComponent(domain)
  return [
    `https://www.google.com/s2/favicons?domain=${enc}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ]
}

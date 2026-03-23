/**
 * Base URL for Supabase auth email links (password recovery, etc.).
 *
 * In production, set `VITE_SITE_URL` to your CRM’s public origin (no trailing slash),
 * e.g. `https://crm.yourdomain.com`. If unset, `window.location.origin` is used (fine for local dev).
 */
export function getAuthSiteUrl(): string {
  const raw = import.meta.env.VITE_SITE_URL as string | undefined
  if (raw && typeof raw === 'string') {
    const t = raw.trim().replace(/\/$/, '')
    if (t) return t
  }
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/** Where Supabase redirects after the user clicks “reset password” in email. */
export function getPasswordRecoveryRedirectUrl(): string {
  return `${getAuthSiteUrl()}/auth/update-password`
}

import type { CSSProperties } from 'react'

/** Classic notepad-style surface (yellow pad, dark text). */
export const NOTEPAD_STYLE: CSSProperties = {
  background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
  color: '#111827',
  borderColor: '#d97706',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 2px rgba(0,0,0,0.06)',
}

export const NOTEPAD_CLASS =
  'rounded-lg border shadow-sm transition-[box-shadow,transform] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600'

/** Collapse whitespace to a single line, then truncate with ellipsis (max grapheme-ish: chars). */
export function truncateNotePreview(body: string, maxChars = 100): string {
  const single = body.replace(/\s+/g, ' ').trim()
  if (single.length <= maxChars) return single
  return `${single.slice(0, Math.max(0, maxChars - 1))}…`
}

/** Heading for list cards when legacy rows have empty title. */
export function displayNoteTitle(title: string | null | undefined, body: string): string {
  const t = (title ?? '').trim()
  if (t) return t
  const b = body.replace(/\s+/g, ' ').trim()
  if (!b) return 'Untitled note'
  if (b.length <= 72) return b
  return `${b.slice(0, 71)}…`
}

export function noteMatchesSearch(
  title: string | null | undefined,
  body: string,
  type: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = `${title ?? ''} ${body} ${type}`.toLowerCase()
  return hay.includes(q)
}

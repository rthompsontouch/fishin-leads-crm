import type { Database } from './supabase.types'

type LeadNoteRow = Database['public']['Tables']['lead_notes']['Row']
type CustomerNoteRow = Database['public']['Tables']['customer_notes']['Row']

/** Postgres/PostgREST error when `title` column was never migrated. */
export function isMissingNotesTitleColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /does not exist/i.test(msg) && /\btitle\b/i.test(msg)
}

export function normalizeLeadNoteRow(row: LeadNoteRow): LeadNoteRow {
  return {
    ...row,
    title: typeof row.title === 'string' ? row.title : '',
  }
}

export function normalizeCustomerNoteRow(row: CustomerNoteRow): CustomerNoteRow {
  return {
    ...row,
    title: typeof row.title === 'string' ? row.title : '',
  }
}

/** SQL shown in UI if notes fail until migration is applied. */
export const NOTES_TITLE_MIGRATION_SQL = `alter table public.lead_notes
  add column if not exists title text not null default '';

alter table public.customer_notes
  add column if not exists title text not null default '';`

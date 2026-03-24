import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getLeadById, getLeadNoteById } from '../features/leads/api/leadsApi'
import NotesDatabaseSetupHint from '../components/NotesDatabaseSetupHint'
import { NOTEPAD_CLASS, NOTEPAD_STYLE, displayNoteTitle } from '../lib/noteUi'

export default function LeadNotePage() {
  const { leadId, noteId } = useParams()
  const safeLeadId = useMemo(() => (leadId ? String(leadId) : ''), [leadId])
  const safeNoteId = useMemo(() => (noteId ? String(noteId) : ''), [noteId])

  const isValidUuid = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const leadOk = Boolean(safeLeadId) && isValidUuid(safeLeadId)
  const noteOk = Boolean(safeNoteId) && isValidUuid(safeNoteId)

  if (safeLeadId === 'new') {
    return <Navigate to="/leads/new" replace />
  }

  const { data: lead, isPending: leadPending } = useQuery({
    queryKey: ['lead', safeLeadId],
    queryFn: () => getLeadById(safeLeadId),
    enabled: leadOk,
  })

  const {
    data: note,
    isPending: notePending,
    error: noteError,
  } = useQuery({
    queryKey: ['lead-note', safeLeadId, safeNoteId],
    queryFn: () => getLeadNoteById(safeLeadId, safeNoteId),
    enabled: leadOk && noteOk,
  })

  const leadName = lead
    ? [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead'
    : 'Lead'

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="text-xs opacity-70">
        <Link to="/leads">Leads</Link>
        <span className="opacity-60"> / </span>
        <Link to={`/leads/${safeLeadId}`}>{leadPending ? '…' : leadName}</Link>
        <span className="opacity-60"> / </span>
        <span className="opacity-95">Note</span>
      </div>

      {!leadOk || !noteOk ? (
        <div className="text-sm opacity-80">Invalid link.</div>
      ) : noteError ? (
        <div className="space-y-3">
          <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
            {String((noteError as Error).message)}
          </div>
          <NotesDatabaseSetupHint errorMessage={String((noteError as Error).message)} />
        </div>
      ) : notePending ? (
        <div className="text-sm opacity-80">Loading note…</div>
      ) : !note ? (
        <div className="text-sm opacity-80">Note not found.</div>
      ) : (
        <>
          <div className="crm-page-header">
            <h1 className="crm-page-header-title">{displayNoteTitle(note.title, note.body)}</h1>
          </div>
          <div className="text-xs text-gray-700 opacity-80">
            {new Date(note.occurred_at).toLocaleString()} • {note.type}
          </div>
          <div
            className={`${NOTEPAD_CLASS} p-5 min-h-[12rem]`}
            style={NOTEPAD_STYLE}
          >
            <div className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">
              {note.body || '—'}
            </div>
          </div>
          <Link
            to={`/leads/${safeLeadId}`}
            className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline w-fit"
          >
            ← Back to lead
          </Link>
        </>
      )}
    </div>
  )
}

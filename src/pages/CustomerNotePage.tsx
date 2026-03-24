import { useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteCustomerNote,
  getCustomerById,
  getCustomerNoteById,
} from '../features/customers/api/customersApi'
import NotesDatabaseSetupHint from '../components/NotesDatabaseSetupHint'
import { NOTEPAD_CLASS, NOTEPAD_STYLE, displayNoteTitle } from '../lib/noteUi'

export default function CustomerNotePage() {
  const { customerId, noteId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const safeCustomerId = useMemo(() => (customerId ? String(customerId) : ''), [customerId])
  const safeNoteId = useMemo(() => (noteId ? String(noteId) : ''), [noteId])

  const isValidUuid = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const customerOk = Boolean(safeCustomerId) && isValidUuid(safeCustomerId)
  const noteOk = Boolean(safeNoteId) && isValidUuid(safeNoteId)

  const { data: customer, isPending: customerPending } = useQuery({
    queryKey: ['customer', safeCustomerId],
    queryFn: () => getCustomerById(safeCustomerId),
    enabled: customerOk,
  })

  const {
    data: note,
    isPending: notePending,
    error: noteError,
  } = useQuery({
    queryKey: ['customer-note', safeCustomerId, safeNoteId],
    queryFn: () => getCustomerNoteById(safeCustomerId, safeNoteId),
    enabled: customerOk && noteOk,
  })

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="text-xs opacity-70">
        <Link to="/customers">Customers</Link>
        <span className="opacity-60"> / </span>
        <Link to={`/customers/${safeCustomerId}`}>
          {customerPending ? '…' : customer?.name || 'Customer'}
        </Link>
        <span className="opacity-60"> / </span>
        <span className="opacity-95">Note</span>
      </div>

      {!customerOk || !noteOk ? (
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
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-danger)] disabled:opacity-50"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete note
            </button>
          </div>

          {err ? (
            <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {err}
            </div>
          ) : null}

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
            to={`/customers/${safeCustomerId}`}
            className="text-sm font-semibold text-[color:var(--color-primary)] hover:underline w-fit"
          >
            ← Back to customer
          </Link>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete && Boolean(note)}
        onClose={() => setConfirmDelete(false)}
        title="Delete this note?"
        description="This note will be permanently removed."
        onConfirm={async () => {
          if (!note) return
          setErr(null)
          setBusy(true)
          try {
            await deleteCustomerNote(note.id)
            await queryClient.invalidateQueries({
              queryKey: ['customer-notes', safeCustomerId],
              exact: false,
            })
            navigate(`/customers/${safeCustomerId}`)
          } catch (e) {
            setErr(String((e as Error).message ?? e))
            throw e
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}

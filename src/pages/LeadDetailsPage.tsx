import { useMemo, useState } from 'react'
import NoteSummaryCard from '../components/NoteSummaryCard'
import NotesDatabaseSetupHint from '../components/NotesDatabaseSetupHint'
import {
  MAX_NOTES_PER_RECORD,
  noteLimitReachedMessage,
} from '../lib/noteDbCompat'
import { noteMatchesSearch } from '../lib/noteUi'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addLeadNote,
  convertLeadToCustomer,
  deleteLead,
  deleteLeadNote,
  getLeadById,
  listLeadNotes,
  updateLead,
} from '../features/leads/api/leadsApi'
import ContactActionButtons from '../components/ContactActionButtons'
import {
  OverviewBlock,
  OverviewLink,
  OverviewPill,
  OverviewRow,
  leadStatusTone,
  websiteHref,
} from '../components/entityOverview'
import LeadForm from '../features/leads/components/LeadForm'

export default function LeadDetailsPage() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const safeLeadId = useMemo(() => (leadId ? String(leadId) : ''), [leadId])
  const isValidUuid = useMemo(() => {
    // Basic UUID v4/v1 format check (sufficient for preventing Supabase query errors).
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      safeLeadId,
    )
  }, [safeLeadId])
  const shouldRedirectToCreate = safeLeadId === 'new'

  const {
    data: lead,
    isPending: isLeadPending,
    error: leadError,
  } = useQuery({
    queryKey: ['lead', safeLeadId],
    queryFn: () => getLeadById(safeLeadId),
    enabled: Boolean(safeLeadId) && isValidUuid,
  })

  const {
    data: notes,
    isPending: isNotesPending,
    error: notesError,
  } = useQuery({
    queryKey: ['lead-notes', safeLeadId],
    queryFn: () => listLeadNotes(safeLeadId),
    enabled: Boolean(safeLeadId) && isValidUuid,
  })

  // Safety: sometimes `/leads/new` can be treated as `:leadId = "new"` by the router.
  // Redirect so the create page renders correctly.
  if (shouldRedirectToCreate) {
    return <Navigate to="/leads/new" replace />
  }

  const [isEditing, setIsEditing] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredNotes = useMemo(() => {
    if (!notes) return []
    return notes.filter((n) => noteMatchesSearch(n.title, n.body, n.type, noteSearch))
  }, [notes, noteSearch])

  const name = lead
    ? [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    : ''

  const lastContactedLabel =
    lead?.last_contacted_at === null
      ? 'Uncontacted'
      : lead?.last_contacted_at
        ? `Last contacted: ${new Date(lead.last_contacted_at).toLocaleDateString()}`
        : '—'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">
            <Link to="/leads">Leads</Link>
            <span className="opacity-60"> / </span>
            <span className="opacity-95">
              {isLeadPending ? 'Loading...' : name || 'Lead'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold mt-1">
            {isLeadPending ? 'Loading...' : name || '—'}
          </h1>
          <div className="text-sm opacity-80 mt-2">{lastContactedLabel}</div>
          {lead && !isLeadPending ? (
            <div className="mt-3">
              <ContactActionButtons
                phone={lead.phone}
                email={lead.email}
                contactLabel={name || undefined}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsEditing((v) => !v)}
            disabled={!lead || isLeadPending}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              if (!lead) return
              const ok = window.confirm(
                `Delete this lead for ${name || 'this lead'}? This cannot be undone.`,
              )
              if (!ok) return
              setSaving(true)
              try {
                await deleteLead(lead.id)
                await queryClient.invalidateQueries({
                  queryKey: ['leads'],
                  exact: false,
                })
                navigate('/leads')
              } catch (e) {
                alert(String((e as Error).message ?? e))
              } finally {
                setSaving(false)
              }
            }}
            disabled={!lead || isLeadPending || saving}
          >
            Delete
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={async () => {
              if (!lead) return
              const ok = window.confirm(
                'Convert this lead into a customer? A customer will be created, your latest lead notes (up to 4) will carry over, and this lead will be removed from the leads list.',
              )
              if (!ok) return
              setSaving(true)
              try {
                const customer = await convertLeadToCustomer(lead.id)
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['customers'] }),
                  queryClient.invalidateQueries({ queryKey: ['leads'] }),
                ])
                navigate(`/customers/${customer.id}`)
              } catch (e) {
                alert(String((e as Error).message ?? e))
              } finally {
                setSaving(false)
              }
            }}
            disabled={!lead || isLeadPending || saving}
          >
            Convert to Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="px-4 sm:px-5 py-3.5 border-b"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface-1)',
            }}
          >
            <h2 className="text-sm font-semibold">Lead overview</h2>
            <p className="text-xs opacity-65 mt-0.5">Contact, pipeline, and company details</p>
          </div>

          <div className="p-4 sm:p-5">
            {!isValidUuid ? (
              <div className="text-sm opacity-80">Invalid lead id.</div>
            ) : leadError ? (
              <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
                Failed to load lead: {String((leadError as Error).message)}
              </div>
            ) : isLeadPending ? (
              <div className="text-sm opacity-80">Loading lead...</div>
            ) : lead ? (
              <>
                {!isEditing ? (
                  <div className="space-y-7">
                    <OverviewBlock title="Contact & company">
                      <OverviewRow label="Company">
                        {lead.company?.trim() ? (
                          <span className="font-medium">{lead.company}</span>
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </OverviewRow>
                      <OverviewRow label="Email">
                        {lead.email?.trim() ? (
                          <OverviewLink href={`mailto:${lead.email}`}>{lead.email}</OverviewLink>
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </OverviewRow>
                      <OverviewRow label="Phone">
                        {lead.phone?.trim() ? (
                          <OverviewLink href={`tel:${lead.phone.replace(/\s+/g, '')}`}>
                            {lead.phone}
                          </OverviewLink>
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </OverviewRow>
                      <OverviewRow label="Website">
                        {lead.website?.trim() ? (
                          <OverviewLink href={websiteHref(lead.website)} target="_blank" rel="noreferrer">
                            {lead.website}
                          </OverviewLink>
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </OverviewRow>
                    </OverviewBlock>

                    <OverviewBlock title="Pipeline">
                      <OverviewRow label="Status">
                        <OverviewPill tone={leadStatusTone(lead.status)}>{lead.status}</OverviewPill>
                      </OverviewRow>
                      <OverviewRow label="Source">
                        {lead.source?.trim() ? lead.source : <span className="opacity-50">—</span>}
                      </OverviewRow>
                    </OverviewBlock>

                    <OverviewBlock title="Firmographics">
                      <OverviewRow label="Industry">
                        {lead.industry?.trim() ? lead.industry : <span className="opacity-50">—</span>}
                      </OverviewRow>
                      <OverviewRow label="Company size">
                        {lead.company_size?.trim() ? (
                          lead.company_size
                        ) : (
                          <span className="opacity-50">—</span>
                        )}
                      </OverviewRow>
                    </OverviewBlock>

                    <OverviewBlock title="Record">
                      <OverviewRow label="Created">
                        <span className="tabular-nums opacity-90">
                          {new Date(lead.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </OverviewRow>
                    </OverviewBlock>
                  </div>
                ) : (
                  <div>
                    <LeadForm
                      submitLabel="Save lead"
                      initialValues={{
                        first_name: lead.first_name ?? undefined,
                        last_name: lead.last_name ?? undefined,
                        company: lead.company ?? null,
                        industry: lead.industry ?? null,
                        company_size: lead.company_size ?? null,
                        website: lead.website ?? null,
                        email: lead.email ?? null,
                        phone: lead.phone ?? null,
                        source: lead.source ?? null,
                        status: lead.status,
                      }}
                      onSubmit={async (values) => {
                        setSaving(true)
                        setNoteError(null)
                        try {
                          await updateLead({
                            id: lead.id,
                            first_name: values.first_name ?? null,
                            last_name: values.last_name ?? null,
                            company: values.company ?? null,
                            industry: values.industry ?? null,
                            company_size: values.company_size ?? null,
                            website: values.website ?? null,
                            email: values.email ?? null,
                            phone: values.phone ?? null,
                            source: values.source ?? null,
                            status: values.status,
                          })
                          await queryClient.invalidateQueries({
                            queryKey: ['lead', safeLeadId],
                          })
                          setIsEditing(false)
                        } catch (e) {
                          setNoteError(String((e as Error).message ?? e))
                        } finally {
                          setSaving(false)
                        }
                      }}
                    />
                  </div>
                )}

                {noteError ? (
                  <div className="text-sm mt-4 pt-4 border-t" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-border)' }}>
                    {noteError}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm opacity-80">Lead not found.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="text-sm font-semibold">Lead notes</div>
            <div className="text-xs opacity-70">
              {notes?.length != null ? (
                <span className="tabular-nums">
                  {notes.length} / {MAX_NOTES_PER_RECORD} notes
                </span>
              ) : (
                '—'
              )}
              {notes && notes.length > 0 && noteSearch.trim() ? (
                <span className="ml-2">• showing {filteredNotes.length}</span>
              ) : null}
            </div>
          </div>
          {notes && notes.length > 0 ? (
            <input
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Search notes by title, body, or type…"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none mb-3"
              style={{ borderColor: 'var(--color-border)' }}
            />
          ) : null}
          {notesError ? (
            <div className="space-y-3">
              <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
                Failed to load notes: {String((notesError as Error).message)}
              </div>
              <NotesDatabaseSetupHint errorMessage={String((notesError as Error).message)} />
            </div>
          ) : isNotesPending ? (
            <div className="text-sm opacity-80">Loading notes...</div>
          ) : notes && notes.length > 0 ? (
            filteredNotes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredNotes.map((n) => (
                  <NoteSummaryCard
                    key={n.id}
                    to={`/leads/${safeLeadId}/notes/${n.id}`}
                    title={n.title}
                    body={n.body}
                    type={n.type}
                    occurredAt={n.occurred_at}
                    rightSlot={
                      <button
                        type="button"
                        className="text-xs font-semibold rounded-md px-2 py-1 border cursor-pointer transition-colors duration-150 border-amber-900/30 bg-amber-50 text-gray-900 hover:bg-amber-100 hover:text-[color:var(--color-danger)] disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={async () => {
                          const ok = window.confirm('Delete this note?')
                          if (!ok) return
                          setNoteError(null)
                          try {
                            await deleteLeadNote(n.id)
                            await queryClient.invalidateQueries({
                              queryKey: ['lead-notes', safeLeadId],
                              exact: false,
                            })
                            await queryClient.invalidateQueries({
                              queryKey: ['lead', safeLeadId],
                              exact: false,
                            })
                          } catch (err) {
                            setNoteError(String((err as Error).message ?? err))
                          }
                        }}
                      >
                        Delete
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-80">No notes match your search.</div>
            )
          ) : (
            <div className="text-sm opacity-80">No notes yet.</div>
          )}

          <div className="mt-5 border-t pt-5">
            <div className="text-sm font-semibold mb-3">Add a note</div>
            {isValidUuid ? (
              (notes?.length ?? 0) >= MAX_NOTES_PER_RECORD ? (
                <div
                  className="text-sm rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
                >
                  {noteLimitReachedMessage()}
                </div>
              ) : (
                <LeadNoteComposer
                  leadId={safeLeadId}
                  onAdded={async () => {
                    setNoteError(null)
                    await queryClient.invalidateQueries({ queryKey: ['lead', safeLeadId] })
                    await queryClient.invalidateQueries({
                      queryKey: ['lead-notes', safeLeadId],
                    })
                  }}
                  onError={(msg) => setNoteError(msg)}
                />
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeadNoteComposer({
  leadId,
  onAdded,
  onError,
}: {
  leadId: string
  onAdded: () => Promise<void>
  onError: (msg: string) => void
}) {
  const [type, setType] = useState<'note' | 'call' | 'email_sent' | 'meeting' | 'other'>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [occurredAtLocal, setOccurredAtLocal] = useState(() => {
    const d = new Date()
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      className="grid grid-cols-1 gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!leadId) return
        if (!title.trim()) {
          onError('Note title is required.')
          return
        }
        if (!body.trim()) {
          onError('Note body is required.')
          return
        }

        setSubmitting(true)
        try {
          const occurred = new Date(occurredAtLocal)
          await addLeadNote(leadId, {
            type,
            title: title.trim(),
            body: body.trim(),
            occurred_at: occurred,
          })
          setTitle('')
          setBody('')
          await onAdded()
        } catch (err) {
          onError(String((err as Error).message ?? err))
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          type="text"
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          placeholder="Short label for this note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="note">note</option>
          <option value="call">call</option>
          <option value="email_sent">email_sent</option>
          <option value="meeting">meeting</option>
          <option value="other">other</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Occurred at
        <input
          type="datetime-local"
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
          value={occurredAtLocal}
          onChange={(e) => setOccurredAtLocal(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Body
        <textarea
          className="rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)', minHeight: 90 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          {submitting ? 'Adding...' : 'Add note'}
        </button>
      </div>
    </form>
  )
}


import { useMemo, useState } from 'react'
import { ChevronRight, Pencil, StickyNote, Trash2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import ModalScrollBackdrop from '../components/ModalScrollBackdrop'
import NoteSummaryCard from '../components/NoteSummaryCard'
import NotesDatabaseSetupHint from '../components/NotesDatabaseSetupHint'
import {
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
import {
  listQuotesByLead,
  sendQuote,
  type QuoteWithDetails,
} from '../features/quotes/api/quotesApi'
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
import CreateQuoteModal from '../features/quotes/components/CreateQuoteModal'
import AcceptQuoteJobModal from '../features/quotes/components/AcceptQuoteJobModal'

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

  const {
    data: quotes,
    isPending: isQuotesPending,
    error: quotesError,
  } = useQuery({
    queryKey: ['quotes', safeLeadId],
    queryFn: () => listQuotesByLead(safeLeadId),
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
  const [createQuoteOpen, setCreateQuoteOpen] = useState(false)
  const [acceptQuote, setAcceptQuote] = useState<QuoteWithDetails | null>(null)
  const [confirmDeleteLead, setConfirmDeleteLead] = useState(false)
  const [confirmConvertLead, setConfirmConvertLead] = useState(false)
  const [leadNoteToDelete, setLeadNoteToDelete] = useState<string | null>(null)
  const [leadOverviewExpanded, setLeadOverviewExpanded] = useState(false)
  const [quotesExpanded, setQuotesExpanded] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false)

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
    <div className="crm-light-surface flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <div>
          <h1 className="crm-page-header-title">
            {isLeadPending ? 'Loading...' : name || '—'}
          </h1>
          <div
            className="text-sm mt-1"
            style={{ color: 'var(--crm-content-header-text)', opacity: 0.88 }}
          >
            {lastContactedLabel}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150 border border-slate-400/80 bg-white text-[color:var(--crm-content-header-text)] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsEditing((v) => !v)}
            disabled={!lead || isLeadPending}
          >
            <Pencil size={18} className="shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150 border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setConfirmDeleteLead(true)}
            disabled={!lead || isLeadPending || saving}
          >
            <Trash2 size={18} className="shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
            Delete
          </button>
          <button
            type="button"
            className="rounded-sm px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => setConfirmConvertLead(true)}
            disabled={!lead || isLeadPending || saving}
          >
            Convert to Customer
          </button>
        </div>
      </div>

      <div
        className="text-xs font-medium"
        style={{ color: 'var(--crm-content-header-text)', opacity: 0.8 }}
      >
        <Link
          to="/leads"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Leads
        </Link>
        <span className="opacity-50"> / </span>
        <span>{isLeadPending ? 'Loading...' : name || 'Lead'}</span>
      </div>

      {noteError ? (
        <div
          className="rounded-xl border-2 px-4 py-3 text-sm bg-red-50/80"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)',
            color: 'var(--color-danger)',
          }}
        >
          {noteError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div
            className="px-4 sm:px-5 py-3 border-b bg-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            style={{ borderColor: 'hsl(215 20% 88%)' }}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-2 rounded-sm text-left transition-colors hover:bg-slate-200/60 -m-1 p-1 sm:items-center"
              onClick={() => setLeadOverviewExpanded((v) => !v)}
              aria-expanded={leadOverviewExpanded}
              aria-controls="lead-overview-panel"
              id="lead-overview-toggle"
            >
              <ChevronRight
                size={20}
                className={`mt-0.5 shrink-0 text-slate-600 transition-transform duration-200 sm:mt-0 ${leadOverviewExpanded ? 'rotate-90' : ''}`}
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className="text-sm font-semibold block m-0"
                  style={{ color: 'var(--crm-content-header-text)' }}
                >
                  Lead overview
                </span>
                <span className="text-xs text-slate-600 block m-0 mt-0.5">
                  Contact, pipeline, and company details
                </span>
              </span>
            </button>
            {lead && !isLeadPending ? (
              <div className="shrink-0 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
                <ContactActionButtons
                  phone={lead.phone}
                  email={lead.email}
                  contactLabel={name || undefined}
                  className="sm:justify-end"
                />
              </div>
            ) : null}
          </div>

          {leadOverviewExpanded ? (
            <div id="lead-overview-panel" className="p-4 sm:p-5" role="region" aria-labelledby="lead-overview-toggle">
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
                      <OverviewRow label="Message / details">
                        {(lead as any).details?.trim() ? (
                          <span className="whitespace-pre-wrap">{(lead as any).details}</span>
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
                        details: (lead as any).details ?? null,
                        status: lead.status as any,
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
                            details: values.details ?? null,
                            status: values.status as any,
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
              </>
            ) : (
              <div className="text-sm opacity-80">Lead not found.</div>
            )}
            </div>
          ) : null}

          <div className="border-t" style={{ borderColor: 'hsl(215 20% 88%)' }}>
            <div
              className="px-4 sm:px-5 py-3 border-b bg-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              style={{ borderColor: 'hsl(215 20% 88%)' }}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start gap-2 rounded-sm text-left transition-colors hover:bg-slate-200/60 -m-1 p-1 sm:items-center"
                onClick={() => setQuotesExpanded((v) => !v)}
                aria-expanded={quotesExpanded}
                aria-controls="lead-quotes-panel"
                id="lead-quotes-toggle"
              >
                <ChevronRight
                  size={20}
                  className={`mt-0.5 shrink-0 text-slate-600 transition-transform duration-200 sm:mt-0 ${quotesExpanded ? 'rotate-90' : ''}`}
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span
                    className="text-sm font-semibold block m-0"
                    style={{ color: 'var(--crm-content-header-text)' }}
                  >
                    Quotes
                  </span>
                  <span className="text-xs text-slate-600 block m-0 mt-0.5">
                    Pricing, send, and accept to create a job
                  </span>
                </span>
              </button>
              {lead && !isLeadPending ? (
                <button
                  type="button"
                  className="inline-flex shrink-0 w-full sm:w-auto items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => setCreateQuoteOpen(true)}
                  disabled={isQuotesPending}
                >
                  Create Quote
                </button>
              ) : null}
            </div>

            {quotesExpanded ? (
              <div id="lead-quotes-panel" className="p-4 sm:p-5" role="region" aria-labelledby="lead-quotes-toggle">
                {isLeadPending ? (
                  <div className="text-sm text-slate-600">Loading lead…</div>
                ) : !lead ? (
                  <div className="text-sm text-slate-600">Lead details unavailable.</div>
                ) : quotesError ? (
                  <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
                    Failed to load quotes: {String((quotesError as Error).message)}
                  </div>
                ) : isQuotesPending ? (
                  <div className="text-sm opacity-80">Loading quotes…</div>
                ) : quotes && quotes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {quotes.map((q) => {
                      const quoteTone =
                        q.status === 'Won'
                          ? 'success'
                          : q.status === 'Lost'
                            ? 'danger'
                            : q.status === 'Sent'
                              ? 'info'
                              : 'neutral'

                      return (
                        <div
                          key={q.id}
                          className="rounded-lg border p-4"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="text-xs opacity-70">Quote</div>
                                <div className="text-sm font-semibold mt-0.5">
                                  {q.price_currency} {q.price_amount}
                                </div>
                              </div>
                              <OverviewPill tone={quoteTone as any}>{q.status}</OverviewPill>
                            </div>

                            <div className="text-sm opacity-85">
                              {q.description?.trim() ? q.description : <span className="opacity-50">No description</span>}
                            </div>

                            <div className="text-xs opacity-70">
                              {q.line_items.length > 0 ? `${q.line_items.length} line item(s)` : 'No line items'} •{' '}
                              {q.attachments.length > 0 ? `${q.attachments.length} photo(s)` : 'No photos'}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {q.status === 'Draft' ? (
                                <button
                                  type="button"
                                  className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                                  onClick={async () => {
                                    try {
                                      await sendQuote(q.id)
                                      await queryClient.invalidateQueries({ queryKey: ['quotes', safeLeadId], exact: false })
                                    } catch (e) {
                                      alert(String((e as Error).message ?? e))
                                    }
                                  }}
                                >
                                  Send Quote
                                </button>
                              ) : null}

                              {q.status === 'Sent' ? (
                                <button
                                  type="button"
                                  className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                                  onClick={() => setAcceptQuote(q)}
                                >
                                  Customer accepted → Won & Create Job
                                </button>
                              ) : null}

                              {q.status === 'Won' ? (
                                <div className="text-sm opacity-80 font-semibold">Job created</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">No quotes yet. Create one to start the pipeline.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col min-h-0">
          <div
            className="px-4 py-3 border-b shrink-0 bg-slate-100"
            style={{ borderColor: 'hsl(215 20% 88%)' }}
          >
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded-sm text-left transition-colors hover:bg-slate-200/60 -m-1 p-1 sm:items-center"
              onClick={() => setNotesExpanded((v) => !v)}
              aria-expanded={notesExpanded}
              aria-controls="lead-notes-panel"
              id="lead-notes-toggle"
            >
              <ChevronRight
                size={20}
                className={`mt-0.5 shrink-0 text-slate-600 transition-transform duration-200 sm:mt-0 ${notesExpanded ? 'rotate-90' : ''}`}
                strokeWidth={2.25}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--crm-content-header-text)' }}
                >
                  Lead notes
                </span>
                <span className="text-xs text-slate-600">
                  {notes?.length != null ? <span className="tabular-nums">{notes.length} notes</span> : '—'}
                  {notes && notes.length > 0 && noteSearch.trim() ? (
                    <span className="ml-2">• showing {filteredNotes.length}</span>
                  ) : null}
                </span>
              </div>
            </button>
          </div>

          {notesExpanded ? (
            <div id="lead-notes-panel" className="p-4 sm:p-5 flex flex-col flex-1 min-h-0" role="region" aria-labelledby="lead-notes-toggle">
              {isValidUuid ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 mb-3">
                  <div className="w-full min-w-0 sm:flex-1">
                    {notes && notes.length > 0 ? (
                      <input
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        placeholder="Search notes by title, body, or type…"
                        className="w-full rounded-md border-2 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1 placeholder:text-slate-500"
                        style={{
                          borderColor: 'hsl(215 22% 72%)',
                          color: 'var(--crm-content-header-text)',
                        }}
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddNoteModalOpen(true)}
                    disabled={isLeadPending}
                    className="inline-flex shrink-0 w-full sm:w-auto items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <StickyNote size={18} className="shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
                    Add note
                  </button>
                </div>
              ) : null}

              {notesError ? (
                <div className="space-y-3">
                  <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
                    Failed to load notes: {String((notesError as Error).message)}
                  </div>
                  <NotesDatabaseSetupHint errorMessage={String((notesError as Error).message)} />
                </div>
              ) : isNotesPending ? (
                <div className="text-sm" style={{ color: 'var(--crm-content-header-text)', opacity: 0.85 }}>
                  Loading notes...
                </div>
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
                            className="text-xs font-semibold rounded-md px-2 py-1 border-2 cursor-pointer transition-colors duration-150 border-red-200 bg-red-50/80 text-red-900 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setLeadNoteToDelete(n.id)}
                          >
                            Delete
                          </button>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">No notes match your search.</div>
                )
              ) : (
                <div className="text-sm text-slate-600">No notes yet. Use Add note above.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {lead ? (
        <CreateQuoteModal
          open={createQuoteOpen}
          lead={lead as any}
          onClose={() => setCreateQuoteOpen(false)}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['quotes', safeLeadId], exact: false })
            await queryClient.invalidateQueries({ queryKey: ['lead', safeLeadId], exact: false })
          }}
        />
      ) : null}

      {acceptQuote && lead ? (
        <AcceptQuoteJobModal
          open={true}
          lead={lead}
          quote={acceptQuote}
          onClose={() => setAcceptQuote(null)}
          onAccepted={async () => {
            await queryClient.invalidateQueries({ queryKey: ['quotes', safeLeadId], exact: false })
            await queryClient.invalidateQueries({ queryKey: ['lead', safeLeadId], exact: false })
          }}
        />
      ) : null}

      {addNoteModalOpen ? (
        <ModalScrollBackdrop
          onBackdropClose={() => setAddNoteModalOpen(false)}
          zClass="z-[70]"
          role="dialog"
          aria-modal
          aria-labelledby="lead-add-note-modal-title"
        >
          <div
            className="crm-modal-panel-mobile-fs my-4 w-full max-w-lg max-h-[min(92dvh,720px)] min-h-0 rounded-xl border shadow-lg flex flex-col bg-white ring-1 ring-black/5"
            style={{ borderColor: 'hsl(215 20% 88%)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 border-b shrink-0 bg-slate-100"
              style={{ borderColor: 'hsl(215 20% 88%)' }}
            >
              <h2
                id="lead-add-note-modal-title"
                className="text-base font-semibold m-0"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Add note
              </h2>
              <p className="text-xs text-slate-600 m-0 mt-1">
                {name ? `Log activity for ${name}` : 'Create a lead note'}
              </p>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              <LeadNoteComposer
                leadId={safeLeadId}
                onAdded={async () => {
                  setNoteError(null)
                  await queryClient.invalidateQueries({ queryKey: ['lead', safeLeadId] })
                  await queryClient.invalidateQueries({ queryKey: ['lead-notes', safeLeadId] })
                  setAddNoteModalOpen(false)
                }}
                onError={(msg) => setNoteError(msg)}
                onCancel={() => setAddNoteModalOpen(false)}
              />
            </div>
          </div>
        </ModalScrollBackdrop>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteLead && Boolean(lead)}
        onClose={() => setConfirmDeleteLead(false)}
        title="Delete this lead?"
        description={
          <>
            Permanently delete this lead for <strong>{name || 'this lead'}</strong>? This cannot be
            undone.
          </>
        }
        onConfirm={async () => {
          if (!lead) return
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
            throw e
          } finally {
            setSaving(false)
          }
        }}
      />

      <ConfirmDialog
        open={confirmConvertLead && Boolean(lead)}
        onClose={() => setConfirmConvertLead(false)}
        variant="primary"
        title="Convert to customer?"
        confirmLabel="Convert"
        description="A customer will be created, your latest lead notes (up to 4) will carry over, and this lead will be linked to the customer."
        onConfirm={async () => {
          if (!lead) return
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
            throw e
          } finally {
            setSaving(false)
          }
        }}
      />

      <ConfirmDialog
        open={leadNoteToDelete !== null}
        onClose={() => setLeadNoteToDelete(null)}
        title="Delete this note?"
        description="This note will be permanently removed."
        onConfirm={async () => {
          if (!leadNoteToDelete) return
          setNoteError(null)
          try {
            await deleteLeadNote(leadNoteToDelete)
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
            throw err
          }
        }}
      />
    </div>
  )
}

function LeadNoteComposer({
  leadId,
  onAdded,
  onError,
  onCancel,
}: {
  leadId: string
  onAdded: () => Promise<void>
  onError: (msg: string) => void
  onCancel?: () => void
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

      <div
        className="flex flex-wrap justify-end gap-2 border-t pt-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {onCancel ? (
          <button
            type="button"
            className="crm-cancel-btn rounded-md px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        ) : null}
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


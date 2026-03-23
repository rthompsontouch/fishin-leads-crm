import { useMemo, useState } from 'react'
import NoteSummaryCard from '../components/NoteSummaryCard'
import NotesDatabaseSetupHint from '../components/NotesDatabaseSetupHint'
import {
} from '../lib/noteDbCompat'
import { noteMatchesSearch } from '../lib/noteUi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteCustomer,
  getCustomerById,
  listCustomerActivityEvents,
  listCustomerNotes,
  listServiceEntries,
  deleteCustomerNote,
  updateCustomer,
  deleteServiceEntryWithImages,
} from '../features/customers/api/customersApi'
import { createManualJobForCustomer, listJobsByCustomer } from '../features/jobs/api/jobsApi'
import ContactActionButtons from '../components/ContactActionButtons'
import {
  OverviewBlock,
  OverviewLink,
  OverviewPill,
  OverviewRow,
  OverviewStatGrid,
  customerStatusTone,
  websiteHref,
} from '../components/entityOverview'
import CustomerForm from '../features/customers/components/CustomerForm'
import CustomerNoteComposer from '../features/customers/components/CustomerNoteComposer'
import ServiceEntryForm from '../features/customers/components/ServiceEntryForm'

export default function CustomerDetailsPage() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const safeCustomerId = useMemo(() => (customerId ? String(customerId) : ''), [customerId])

  const isValidUuid = useMemo(() => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      safeCustomerId,
    )
  }, [safeCustomerId])

  const {
    data: customer,
    isPending: isCustomerPending,
    error: customerError,
  } = useQuery({
    queryKey: ['customer', safeCustomerId],
    queryFn: () => getCustomerById(safeCustomerId),
    enabled: Boolean(safeCustomerId) && isValidUuid,
  })

  const {
    data: notes,
    isPending: isNotesPending,
    error: notesError,
  } = useQuery({
    queryKey: ['customer-notes', safeCustomerId],
    queryFn: () => listCustomerNotes(safeCustomerId),
    enabled: Boolean(safeCustomerId) && isValidUuid,
  })

  const {
    data: services,
    isPending: isServicesPending,
    error: servicesError,
  } = useQuery({
    queryKey: ['customer-services', safeCustomerId],
    queryFn: () => listServiceEntries(safeCustomerId),
    enabled: Boolean(safeCustomerId) && isValidUuid,
  })

  const {
    data: upcomingJobs,
    isPending: isJobsPending,
    error: jobsError,
  } = useQuery({
    queryKey: ['customer-jobs', safeCustomerId],
    queryFn: () => listJobsByCustomer(safeCustomerId),
    enabled: Boolean(safeCustomerId) && isValidUuid,
  })

  const {
    data: activity,
    isPending: isActivityPending,
    error: activityError,
  } = useQuery({
    queryKey: ['customer-activity', safeCustomerId],
    queryFn: () => listCustomerActivityEvents(safeCustomerId, 100),
    enabled: Boolean(safeCustomerId) && isValidUuid,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [manualJobDate, setManualJobDate] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [manualJobNotes, setManualJobNotes] = useState('')
  const [manualJobReminderAt, setManualJobReminderAt] = useState('')
  const [manualJobRecurring, setManualJobRecurring] = useState(false)
  const [manualJobRecurrenceUnit, setManualJobRecurrenceUnit] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [manualJobSubmitting, setManualJobSubmitting] = useState(false)

  const filteredNotes = useMemo(() => {
    if (!notes) return []
    return notes.filter((n) => noteMatchesSearch(n.title, n.body, n.type, noteSearch))
  }, [notes, noteSearch])

  async function handleDelete() {
    if (!customer) return
    const ok = window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)
    if (!ok) return
    await deleteCustomer(customer.id)
    await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
    navigate('/customers')
  }

  const customerSubtitle = useMemo(() => {
    if (!customer) return '—'
    return customer.primary_email || customer.primary_phone || '—'
  }, [customer])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs opacity-70">
            <Link to="/customers">Customers</Link>
            <span className="opacity-60"> / </span>
            <span className="opacity-95">
              {isCustomerPending ? 'Loading...' : customer?.name || 'Customer'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold mt-1">
            {isCustomerPending ? 'Loading...' : customer?.name || '—'}
          </h1>
          <div className="text-sm opacity-80 mt-2">{customerSubtitle}</div>
          {customer && !isCustomerPending ? (
            <div className="mt-3">
              <ContactActionButtons
                phone={customer.primary_phone}
                email={customer.primary_email}
                contactLabel={customer.name}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsEditing((v) => !v)}
            disabled={!customer || isCustomerPending}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-danger)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => void handleDelete()}
            disabled={!customer || isCustomerPending}
          >
            Delete
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
          {actionError}
        </div>
      ) : null}

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
            <h2 className="text-sm font-semibold">Customer overview</h2>
            <p className="text-xs opacity-65 mt-0.5">Account, contact, billing, and activity</p>
          </div>

          <div className="p-4 sm:p-5">
            {customerError ? (
              <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
                Failed to load customer: {String((customerError as Error).message)}
              </div>
            ) : isCustomerPending ? (
              <div className="text-sm opacity-80">Loading customer...</div>
            ) : customer ? (
              !isEditing ? (
                <div className="space-y-7">
                  <OverviewBlock title="Account">
                    <OverviewRow label="Name">
                      <span className="font-medium">{customer.name}</span>
                    </OverviewRow>
                    <OverviewRow label="Status">
                      <OverviewPill tone={customerStatusTone(customer.status)}>
                        {customer.status}
                      </OverviewPill>
                    </OverviewRow>
                  </OverviewBlock>

                  <OverviewBlock title="Primary contact">
                    <OverviewRow label="Name">
                      {[customer.primary_first_name, customer.primary_last_name]
                        .filter(Boolean)
                        .join(' ') || <span className="opacity-50">—</span>}
                    </OverviewRow>
                    <OverviewRow label="Title">
                      {customer.primary_title?.trim() ? (
                        customer.primary_title
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </OverviewRow>
                    <OverviewRow label="Email">
                      {customer.primary_email?.trim() ? (
                        <OverviewLink href={`mailto:${customer.primary_email}`}>
                          {customer.primary_email}
                        </OverviewLink>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </OverviewRow>
                    <OverviewRow label="Phone">
                      {customer.primary_phone?.trim() ? (
                        <OverviewLink
                          href={`tel:${customer.primary_phone.replace(/\s+/g, '')}`}
                        >
                          {customer.primary_phone}
                        </OverviewLink>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </OverviewRow>
                  </OverviewBlock>

                  <OverviewBlock title="Company">
                    <OverviewRow label="Industry">
                      {customer.industry?.trim() ? customer.industry : <span className="opacity-50">—</span>}
                    </OverviewRow>
                    <OverviewRow label="Company size">
                      {customer.company_size?.trim() ? (
                        customer.company_size
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </OverviewRow>
                    <OverviewRow label="Website">
                      {customer.website?.trim() ? (
                        <OverviewLink
                          href={websiteHref(customer.website)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {customer.website}
                        </OverviewLink>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </OverviewRow>
                  </OverviewBlock>

                  <OverviewBlock title="Billing address">
                    {(() => {
                      const lines = [
                        customer.billing_street?.trim() || '',
                        [
                          customer.billing_city,
                          customer.billing_state,
                          customer.billing_postal_code,
                        ]
                          .filter(Boolean)
                          .join(', '),
                        customer.billing_country?.trim() || '',
                      ].filter(Boolean)
                      return (
                        <OverviewRow label="Address">
                          {lines.length > 0 ? (
                            <div className="space-y-1 font-medium">
                              {lines.map((line, i) => (
                                <div key={i}>{line}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="opacity-50">—</span>
                          )}
                        </OverviewRow>
                      )
                    })()}
                  </OverviewBlock>

                  <OverviewBlock title="Record">
                    <OverviewRow label="Created">
                      <span className="tabular-nums opacity-90">
                        {new Date(customer.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </OverviewRow>
                  </OverviewBlock>

                  <OverviewBlock title="Activity">
                    <OverviewStatGrid
                      stats={[
                        {
                          label: 'Notes',
                          value: notes != null ? notes.length : '—',
                        },
                        {
                          label: 'Services',
                          value: services != null ? services.length : '—',
                        },
                        {
                          label: 'Last activity',
                          value:
                            notes && notes.length > 0
                              ? new Date(notes[0].occurred_at).toLocaleDateString(undefined, {
                                  dateStyle: 'medium',
                                })
                              : services && services.length > 0
                                ? new Date(services[0].service_date).toLocaleDateString(undefined, {
                                    dateStyle: 'medium',
                                  })
                                : '—',
                        },
                      ]}
                    />
                  </OverviewBlock>
                </div>
              ) : (
                <CustomerForm
                  submitLabel="Save changes"
                  initialValues={{
                    name: customer.name,
                    primary_first_name: customer.primary_first_name,
                    primary_last_name: customer.primary_last_name,
                    primary_title: customer.primary_title,
                    primary_email: customer.primary_email,
                    primary_phone: customer.primary_phone,
                    industry: customer.industry,
                    company_size: customer.company_size,
                    website: customer.website,
                    billing_street: customer.billing_street,
                    billing_city: customer.billing_city,
                    billing_state: customer.billing_state,
                    billing_postal_code: customer.billing_postal_code,
                    billing_country: customer.billing_country,
                    status: customer.status,
                  }}
                  onSubmit={async (values) => {
                    setActionError(null)
                    await updateCustomer({
                      id: customer.id,
                      name: values.name,
                      primary_first_name: values.primary_first_name,
                      primary_last_name: values.primary_last_name,
                      primary_title: values.primary_title,
                      primary_email: values.primary_email,
                      primary_phone: values.primary_phone,
                      industry: values.industry,
                      company_size: values.company_size,
                      website: values.website,
                      billing_street: values.billing_street,
                      billing_city: values.billing_city,
                      billing_state: values.billing_state,
                      billing_postal_code: values.billing_postal_code,
                      billing_country: values.billing_country,
                      status: values.status,
                    })
                    await queryClient.invalidateQueries({
                      queryKey: ['customer', safeCustomerId],
                      exact: false,
                    })
                    setIsEditing(false)
                  }}
                />
              )
            ) : (
              <div className="text-sm opacity-80">Customer not found.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="text-sm font-semibold">Customer notes</div>
            <div className="text-xs opacity-70">
              {notes?.length != null ? <span className="tabular-nums">{notes.length} notes</span> : '—'}
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
                    to={`/customers/${safeCustomerId}/notes/${n.id}`}
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
                          setActionError(null)
                          try {
                            await deleteCustomerNote(n.id)
                            await queryClient.invalidateQueries({
                              queryKey: ['customer-notes', safeCustomerId],
                              exact: false,
                            })
                          } catch (err) {
                            setActionError(String((err as Error).message ?? err))
                          }
                        }}
                        disabled={isCustomerPending}
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
              <CustomerNoteComposer
                customerId={safeCustomerId}
                onAdded={async () => {
                  setActionError(null)
                  await queryClient.invalidateQueries({
                    queryKey: ['customer-notes', safeCustomerId],
                    exact: false,
                  })
                }}
                onError={(msg) => setActionError(msg)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Upcoming jobs</div>
        </div>

        <form
          className="mt-4 rounded-lg border p-3 grid grid-cols-1 md:grid-cols-2 gap-3"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!safeCustomerId) return
            setActionError(null)
            setManualJobSubmitting(true)
            try {
              await createManualJobForCustomer({
                customer_id: safeCustomerId,
                scheduled_date: manualJobDate,
                notes: manualJobNotes.trim() ? manualJobNotes.trim() : null,
                is_recurring: manualJobRecurring,
                recurrence_unit: manualJobRecurring ? manualJobRecurrenceUnit : null,
                reminder_at: manualJobReminderAt ? new Date(manualJobReminderAt) : null,
                quote_price_amount: 0,
                quote_description: 'Manual job',
              })
              setManualJobNotes('')
              setManualJobReminderAt('')
              await queryClient.invalidateQueries({ queryKey: ['customer-jobs', safeCustomerId], exact: false })
              await queryClient.invalidateQueries({ queryKey: ['customer-activity', safeCustomerId], exact: false })
            } catch (err) {
              setActionError(String((err as Error).message ?? err))
            } finally {
              setManualJobSubmitting(false)
            }
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            Schedule date
            <input
              type="date"
              value={manualJobDate}
              onChange={(e) => setManualJobDate(e.target.value)}
              className="rounded-md border px-3 py-2 outline-none"
              style={{ borderColor: 'var(--color-border)' }}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Reminder (optional)
            <input
              type="datetime-local"
              value={manualJobReminderAt}
              onChange={(e) => setManualJobReminderAt(e.target.value)}
              className="rounded-md border px-3 py-2 outline-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1 text-sm">
            Job notes (optional)
            <textarea
              value={manualJobNotes}
              onChange={(e) => setManualJobNotes(e.target.value)}
              className="rounded-md border px-3 py-2 outline-none"
              style={{ borderColor: 'var(--color-border)', minHeight: 80 }}
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manualJobRecurring}
                onChange={(e) => setManualJobRecurring(e.target.checked)}
              />
              Recurring
            </label>
            {manualJobRecurring ? (
              <select
                value={manualJobRecurrenceUnit}
                onChange={(e) => setManualJobRecurrenceUnit(e.target.value as any)}
                className="rounded-md border px-3 py-2 outline-none text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            ) : null}
            <button
              type="submit"
              disabled={manualJobSubmitting}
              className="ml-auto rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {manualJobSubmitting ? 'Creating…' : 'Create manual job'}
            </button>
          </div>
        </form>

        {jobsError ? (
          <div className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            Failed to load jobs: {String((jobsError as Error).message)}
          </div>
        ) : isJobsPending ? (
          <div className="text-sm opacity-80 mt-3">Loading jobs...</div>
        ) : upcomingJobs && upcomingJobs.length > 0 ? (
          <div className="flex flex-col gap-3 mt-4">
            {upcomingJobs.map((job) => (
              <div key={job.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      {job.status === 'Scheduled' ? 'Scheduled' : 'Completed'} •{' '}
                      {new Date(job.scheduled_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs opacity-80">
                      {job.quote
                        ? `Original quote: ${job.quote.price_currency} ${job.quote.price_amount}`
                        : `Quote ID: ${job.quote_id}`}
                    </div>
                    {job.quote?.description?.trim() ? (
                      <div className="text-xs opacity-70 whitespace-pre-wrap">{job.quote.description}</div>
                    ) : null}
                    {job.notes?.trim() ? (
                      <div className="text-xs opacity-70 whitespace-pre-wrap">Job notes: {job.notes}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.lead_id ? (
                      <Link
                        to={`/leads/${job.lead_id}`}
                        className="rounded-md px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]"
                      >
                        Open lead
                      </Link>
                    ) : null}
                    <Link
                      to={`/jobs/${job.id}`}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)]"
                    >
                      Open job
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm opacity-80">No upcoming jobs yet.</div>
        )}
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Service history</div>
        </div>

        {servicesError ? (
          <div className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            Failed to load services: {String((servicesError as Error).message)}
          </div>
        ) : isServicesPending ? (
          <div className="text-sm opacity-80 mt-3">Loading services...</div>
        ) : services && services.length > 0 ? (
          <div className="flex flex-col gap-4 mt-4">
            {services.map((s) => (
              <div key={s.id} className="border rounded-xl p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">
                      {new Date(s.service_date).toLocaleDateString()} • {s.description}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {s.price_amount !== null && s.price_amount !== undefined
                        ? `Price: ${s.price_amount} ${s.price_currency}`
                        : 'No price'}
                    </div>
                    {s.job_id ? (
                      <div className="text-xs mt-2">
                        <Link
                          to={`/jobs/${s.job_id}`}
                          className="font-semibold no-underline"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          Open source job
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold rounded-md px-2 py-1 border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-danger)] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={async () => {
                      const ok = window.confirm(
                        'Delete this service entry (and its attachments)?',
                      )
                      if (!ok) return
                      setActionError(null)
                      try {
                        await deleteServiceEntryWithImages(s.id)
                        await queryClient.invalidateQueries({
                          queryKey: ['customer-services', safeCustomerId],
                          exact: false,
                        })
                      } catch (e) {
                        setActionError(String((e as Error).message ?? e))
                      }
                    }}
                    disabled={isCustomerPending}
                  >
                    Delete
                  </button>
                </div>

                {s.attachments && s.attachments.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.attachments.map((a) => (
                      <div
                        key={a.id}
                        className="w-20 h-20 rounded-md overflow-hidden border"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
                      >
                        {a.signed_url && (a.content_type ?? '').startsWith('image/') ? (
                          <img
                            src={a.signed_url}
                            alt={a.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : a.signed_url ? (
                          <a
                            href={a.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-full w-full flex items-center justify-center text-[10px] p-2 break-all text-center no-underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {a.file_name}
                          </a>
                        ) : (
                          <div className="text-[10px] p-2 break-all opacity-70">
                            {a.file_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs opacity-70 mt-3">No attachments</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm opacity-80">No services yet.</div>
        )}

        <div className="mt-6">
          <ServiceEntryForm
            customerId={safeCustomerId}
            onAdded={async () => {
              setActionError(null)
              await queryClient.invalidateQueries({ queryKey: ['customer-services', safeCustomerId], exact: false })
            }}
            onError={(msg) => setActionError(msg)}
          />
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Activity log</div>
        </div>

        {activityError ? (
          <div className="text-sm mt-3" style={{ color: 'var(--color-danger)' }}>
            Failed to load activity: {String((activityError as Error).message)}
          </div>
        ) : isActivityPending ? (
          <div className="text-sm opacity-80 mt-3">Loading activity...</div>
        ) : activity && activity.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            {activity.map((evt) => (
              <div
                key={evt.id}
                className="rounded-lg border px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div>
                  <div className="text-sm">{evt.summary}</div>
                  <div className="text-xs opacity-70">{new Date(evt.created_at).toLocaleString()}</div>
                </div>
                {evt.target_path ? (
                  <Link
                    to={evt.target_path}
                    className="rounded-md px-2 py-1 text-xs font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] no-underline self-start sm:self-auto"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm opacity-80">No activity yet.</div>
        )}
      </div>
    </div>
  )
}


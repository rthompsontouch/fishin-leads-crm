import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import ModalScrollBackdrop from '../components/ModalScrollBackdrop'
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
import {
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardStatsPeriod,
  getPeriodRange,
  scheduledDateInRange,
} from '../lib/dashboardPeriods'

const ACTIVITY_PAGE_SIZE = 10

const CRM_PERIOD_SELECT_CLASS =
  'min-w-[9.5rem] flex-1 rounded-sm py-1.5 pl-1 pr-8 text-sm font-semibold cursor-pointer outline-none ' +
  'border-0 bg-transparent transition-opacity duration-150 appearance-none bg-[length:1rem] bg-[right_0.35rem_center] bg-no-repeat ' +
  'focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 ' +
  'hover:opacity-90'

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

  const [activityPage, setActivityPage] = useState(0)

  const {
    data: activityResult,
    isPending: isActivityPending,
    error: activityError,
  } = useQuery({
    queryKey: ['customer-activity', safeCustomerId, activityPage],
    queryFn: () =>
      listCustomerActivityEvents(safeCustomerId, {
        limit: ACTIVITY_PAGE_SIZE,
        offset: activityPage * ACTIVITY_PAGE_SIZE,
      }),
    enabled: Boolean(safeCustomerId) && isValidUuid,
  })

  const activity = activityResult?.events
  const activityTotal = activityResult?.total ?? 0
  const activityPageCount = Math.max(1, Math.ceil(activityTotal / ACTIVITY_PAGE_SIZE))
  const activityShowingFrom = activityTotal === 0 ? 0 : activityPage * ACTIVITY_PAGE_SIZE + 1
  const activityShowingTo = Math.min(activityTotal, (activityPage + 1) * ACTIVITY_PAGE_SIZE)

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
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const [overviewExpanded, setOverviewExpanded] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [scheduleJobModalOpen, setScheduleJobModalOpen] = useState(false)
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false)
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false)
  const [upcomingJobsPeriod, setUpcomingJobsPeriod] = useState<DashboardStatsPeriod>('week')

  useEffect(() => {
    setActivityPage(0)
    setUpcomingJobsPeriod('week')
  }, [safeCustomerId])

  useEffect(() => {
    if (activityTotal > 0 && activityPage >= activityPageCount) {
      setActivityPage(Math.max(0, activityPageCount - 1))
    }
  }, [activityTotal, activityPage, activityPageCount])

  const filteredNotes = useMemo(() => {
    if (!notes) return []
    return notes.filter((n) => noteMatchesSearch(n.title, n.body, n.type, noteSearch))
  }, [notes, noteSearch])

  const customerSubtitle = useMemo(() => {
    if (!customer) return '—'
    return customer.primary_email || customer.primary_phone || '—'
  }, [customer])

  const upcomingJobsRange = useMemo(
    () => getPeriodRange(upcomingJobsPeriod),
    [upcomingJobsPeriod],
  )

  const filteredUpcomingJobs = useMemo(() => {
    if (!upcomingJobs) return []
    return upcomingJobs.filter((j) => scheduledDateInRange(j.scheduled_date, upcomingJobsRange))
  }, [upcomingJobs, upcomingJobsRange])

  return (
    <div className="crm-light-surface flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <div>
          <h1 className="crm-page-header-title">
            {isCustomerPending ? 'Loading...' : customer?.name || '—'}
          </h1>
          <div
            className="text-sm mt-1"
            style={{ color: 'var(--crm-content-header-text)', opacity: 0.88 }}
          >
            {customerSubtitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150 border border-slate-400/80 bg-white text-[color:var(--crm-content-header-text)] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsEditing((v) => !v)}
            disabled={!customer || isCustomerPending}
          >
            <Pencil size={18} className="shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150 border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setConfirmDeleteCustomer(true)}
            disabled={!customer || isCustomerPending}
          >
            <Trash2 size={18} className="shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
            Delete
          </button>
        </div>
      </div>

      <div
        className="text-xs font-medium"
        style={{ color: 'var(--crm-content-header-text)', opacity: 0.8 }}
      >
        <Link
          to="/customers"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Customers
        </Link>
        <span className="opacity-50"> / </span>
        <span>
          {isCustomerPending ? 'Loading...' : customer?.name || 'Customer'}
        </span>
      </div>

      {actionError ? (
        <div
          className="rounded-xl border-2 px-4 py-3 text-sm bg-red-50/80"
          style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)', color: 'var(--color-danger)' }}
        >
          {actionError}
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
              onClick={() => setOverviewExpanded((v) => !v)}
              aria-expanded={overviewExpanded}
              aria-controls="customer-overview-panel"
              id="customer-overview-toggle"
            >
              <ChevronRight
                size={20}
                className={`mt-0.5 shrink-0 text-slate-600 transition-transform duration-200 sm:mt-0 ${overviewExpanded ? 'rotate-90' : ''}`}
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className="text-sm font-semibold block m-0"
                  style={{ color: 'var(--crm-content-header-text)' }}
                >
                  Customer overview
                </span>
                <span className="text-xs text-slate-600 block m-0 mt-0.5">
                  Account, contact, billing, and activity
                </span>
              </span>
            </button>
            {customer && !isCustomerPending ? (
              <div className="shrink-0 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
                <ContactActionButtons
                  phone={customer.primary_phone}
                  email={customer.primary_email}
                  contactLabel={customer.name}
                  className="sm:justify-end"
                />
              </div>
            ) : null}
          </div>

          {customerError ? (
            <div
              className="px-4 sm:px-5 py-3 text-sm border-b"
              style={{ borderColor: 'hsl(215 20% 88%)', color: 'var(--color-danger)' }}
            >
              Failed to load customer: {String((customerError as Error).message)}
            </div>
          ) : null}

          {overviewExpanded ? (
            <div id="customer-overview-panel" className="p-4 sm:p-5" role="region" aria-labelledby="customer-overview-toggle">
            {isCustomerPending ? (
              <div className="text-sm" style={{ color: 'var(--crm-content-header-text)', opacity: 0.85 }}>
                Loading customer...
              </div>
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
              <div className="text-sm text-slate-600">Customer not found.</div>
            )}
            </div>
          ) : null}
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
              aria-controls="customer-notes-panel"
              id="customer-notes-toggle"
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
                  Customer notes
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
            <div id="customer-notes-panel" className="p-4 sm:p-5 flex flex-col flex-1 min-h-0" role="region" aria-labelledby="customer-notes-toggle">
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
                  disabled={isCustomerPending}
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
                      to={`/customers/${safeCustomerId}/notes/${n.id}`}
                      title={n.title}
                      body={n.body}
                      type={n.type}
                      occurredAt={n.occurred_at}
                      rightSlot={
                        <button
                          type="button"
                          className="text-xs font-semibold rounded-md px-2 py-1 border-2 cursor-pointer transition-colors duration-150 border-red-200 bg-red-50/80 text-red-900 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setNoteToDelete(n.id)}
                          disabled={isCustomerPending}
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

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div
          className="px-4 sm:px-5 py-3 border-b bg-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          <div className="min-w-0">
            <div
              className="text-sm font-semibold"
              style={{ color: 'var(--crm-content-header-text)' }}
            >
              Upcoming jobs
            </div>
            <p className="text-xs text-slate-600 m-0 mt-0.5">
              Filter by scheduled date (same as dashboard) — Schedule adds a job
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className="crm-dashboard-period-field inline-flex items-center gap-2 rounded-sm border-2 px-2 py-0.5 transition-opacity hover:opacity-95"
              style={{
                borderColor: 'var(--crm-content-header-text)',
                backgroundColor: 'transparent',
              }}
            >
              <Calendar
                size={18}
                className="shrink-0 pointer-events-none"
                style={{ color: 'var(--crm-content-header-text)' }}
                aria-hidden
              />
              <select
                id="customer-upcoming-jobs-period"
                aria-label="Upcoming jobs period"
                value={upcomingJobsPeriod}
                onChange={(e) => setUpcomingJobsPeriod(e.target.value as DashboardStatsPeriod)}
                className={CRM_PERIOD_SELECT_CLASS}
                style={{
                  color: 'var(--crm-content-header-text)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                }}
              >
                {DASHBOARD_PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setScheduleJobModalOpen(true)}
              disabled={!isValidUuid || isCustomerPending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} className="shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
              Schedule
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
        {jobsError ? (
          <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load jobs: {String((jobsError as Error).message)}
          </div>
        ) : isJobsPending ? (
          <div className="text-sm text-slate-600">Loading jobs...</div>
        ) : !upcomingJobs || upcomingJobs.length === 0 ? (
          <div className="text-sm text-slate-600">No upcoming jobs yet. Click Schedule to add one.</div>
        ) : filteredUpcomingJobs.length === 0 ? (
          <div className="text-sm text-slate-600">
            No jobs in this period. Choose <strong>All time</strong> or another range in the period menu
            above.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredUpcomingJobs.map((job) => {
              const statusColor =
                job.status === 'Completed'
                  ? 'var(--color-success)'
                  : job.status === 'Scheduled'
                    ? 'var(--color-info)'
                    : 'var(--color-accent)'
              return (
              <div
                key={job.id}
                className="rounded-lg border p-4 transition-colors hover:bg-slate-50/80"
                style={{ borderColor: 'hsl(215 20% 88%)' }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                          border: '1px solid hsl(215 22% 78%)',
                        }}
                      >
                        <span style={{ color: statusColor }}>{job.status}</span>
                      </span>
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: 'var(--crm-content-header-text)' }}
                      >
                        {new Date(job.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {job.quote
                        ? `Quote: ${job.quote.price_currency} ${job.quote.price_amount}`
                        : `Quote ID: ${job.quote_id}`}
                    </div>
                    {job.quote?.description?.trim() ? (
                      <div className="text-xs text-slate-600 whitespace-pre-wrap">{job.quote.description}</div>
                    ) : null}
                    {job.notes?.trim() ? (
                      <div className="text-xs text-slate-600 whitespace-pre-wrap">Job notes: {job.notes}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {job.lead_id ? (
                      <Link
                        to={`/leads/${job.lead_id}`}
                        className="rounded-md px-3 py-1.5 text-xs font-semibold border-2 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50 no-underline"
                        style={{
                          color: 'var(--crm-content-header-text)',
                          borderColor: 'hsl(215 22% 55%)',
                        }}
                      >
                        Open lead
                      </Link>
                    ) : null}
                    <Link
                      to={`/jobs/${job.id}`}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white no-underline cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)]"
                    >
                      Open job
                    </Link>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {scheduleJobModalOpen ? (
        <ModalScrollBackdrop
          onBackdropClose={() => setScheduleJobModalOpen(false)}
          zClass="z-[70]"
          role="dialog"
          aria-modal
          aria-labelledby="schedule-job-modal-title"
        >
          <div
            className="my-4 w-full max-w-lg max-h-[min(92dvh,720px)] min-h-0 rounded-xl border shadow-lg flex flex-col bg-white ring-1 ring-black/5"
            style={{ borderColor: 'hsl(215 20% 88%)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 border-b shrink-0 bg-slate-100"
              style={{ borderColor: 'hsl(215 20% 88%)' }}
            >
              <h2
                id="schedule-job-modal-title"
                className="text-base font-semibold m-0"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Schedule a job
              </h2>
              <p className="text-xs text-slate-600 m-0 mt-1">
                {customer?.name ? `For ${customer.name}` : 'Create a manual job on the calendar'}
              </p>
            </div>
            <form
              className="p-5 overflow-y-auto flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3"
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
                  setManualJobRecurring(false)
                  setScheduleJobModalOpen(false)
                  await queryClient.invalidateQueries({ queryKey: ['customer-jobs', safeCustomerId], exact: false })
                  await queryClient.invalidateQueries({ queryKey: ['customer-activity', safeCustomerId], exact: false })
                } catch (err) {
                  setActionError(String((err as Error).message ?? err))
                } finally {
                  setManualJobSubmitting(false)
                }
              }}
            >
              <label
                className="flex flex-col gap-1.5 text-sm font-medium"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Schedule date
                <input
                  type="date"
                  value={manualJobDate}
                  onChange={(e) => setManualJobDate(e.target.value)}
                  className="rounded-md border-2 px-3 py-2 outline-none text-sm font-normal bg-white focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1"
                  style={{ borderColor: 'hsl(215 22% 72%)', color: 'var(--crm-content-header-text)' }}
                  required
                />
              </label>
              <label
                className="flex flex-col gap-1.5 text-sm font-medium"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Reminder (optional)
                <input
                  type="datetime-local"
                  value={manualJobReminderAt}
                  onChange={(e) => setManualJobReminderAt(e.target.value)}
                  className="rounded-md border-2 px-3 py-2 outline-none text-sm font-normal bg-white focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1"
                  style={{ borderColor: 'hsl(215 22% 72%)', color: 'var(--crm-content-header-text)' }}
                />
              </label>
              <label
                className="md:col-span-2 flex flex-col gap-1.5 text-sm font-medium"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Job notes (optional)
                <textarea
                  value={manualJobNotes}
                  onChange={(e) => setManualJobNotes(e.target.value)}
                  className="rounded-md border-2 px-3 py-2 outline-none text-sm font-normal min-h-[80px] bg-white focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1"
                  style={{ borderColor: 'hsl(215 22% 72%)', color: 'var(--crm-content-header-text)' }}
                />
              </label>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--crm-content-header-text)' }}
                >
                  <input
                    type="checkbox"
                    checked={manualJobRecurring}
                    onChange={(e) => setManualJobRecurring(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Recurring
                </label>
                {manualJobRecurring ? (
                  <select
                    value={manualJobRecurrenceUnit}
                    onChange={(e) => setManualJobRecurrenceUnit(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    className="rounded-md border-2 px-3 py-2 outline-none text-sm bg-white focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1"
                    style={{ borderColor: 'hsl(215 22% 72%)', color: 'var(--crm-content-header-text)' }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                ) : null}
              </div>
              <div className="md:col-span-2 flex flex-wrap justify-end gap-2 pt-2 border-t" style={{ borderColor: 'hsl(215 20% 88%)' }}>
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm font-semibold border-2 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50"
                  style={{
                    color: 'var(--crm-content-header-text)',
                    borderColor: 'hsl(215 22% 72%)',
                  }}
                  onClick={() => setScheduleJobModalOpen(false)}
                  disabled={manualJobSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualJobSubmitting}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {manualJobSubmitting ? 'Creating…' : 'Create job'}
                </button>
              </div>
            </form>
          </div>
        </ModalScrollBackdrop>
      ) : null}

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div
          className="px-4 sm:px-5 py-3 border-b bg-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          <div className="min-w-0">
            <div
              className="text-sm font-semibold"
              style={{ color: 'var(--crm-content-header-text)' }}
            >
              Service history
            </div>
            <p className="text-xs text-slate-600 m-0 mt-0.5">
              Completed work and attachments — use Add service to log an entry
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddServiceModalOpen(true)}
            disabled={!isValidUuid || isCustomerPending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardList size={18} className="shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
            Add service
          </button>
        </div>

        <div className="p-4 sm:p-5">
        {servicesError ? (
          <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load services: {String((servicesError as Error).message)}
          </div>
        ) : isServicesPending ? (
          <div className="text-sm text-slate-600">Loading services...</div>
        ) : services && services.length > 0 ? (
          <div className="flex flex-col gap-4">
            {services.map((s) => (
              <div
                key={s.id}
                className="border rounded-lg p-4 transition-colors hover:bg-slate-50/60"
                style={{ borderColor: 'hsl(215 20% 88%)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: 'var(--crm-content-header-text)' }}
                    >
                      {new Date(s.service_date).toLocaleDateString()} • {s.description}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {s.price_amount !== null && s.price_amount !== undefined
                        ? `Price: ${s.price_amount} ${s.price_currency}`
                        : 'No price'}
                    </div>
                    {s.job_id ? (
                      <div className="text-xs mt-2">
                        <Link
                          to={`/jobs/${s.job_id}`}
                          className="font-semibold no-underline underline-offset-2 hover:underline"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          Open source job
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold shrink-0 rounded-md px-2 py-1 border-2 cursor-pointer transition-colors duration-150 bg-white hover:bg-red-50 hover:border-red-200"
                    style={{
                      color: 'var(--color-danger)',
                      borderColor: 'hsl(215 22% 72%)',
                    }}
                    onClick={() => setServiceToDelete(s.id)}
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
                        className="w-20 h-20 rounded-md overflow-hidden border-2 bg-slate-50"
                        style={{ borderColor: 'hsl(215 20% 88%)' }}
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
                  <div className="text-xs text-slate-500 mt-3">No attachments</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No services yet. Click Add service to log one.</div>
        )}
        </div>
      </div>

      {addServiceModalOpen ? (
        <ModalScrollBackdrop
          onBackdropClose={() => setAddServiceModalOpen(false)}
          zClass="z-[70]"
          role="dialog"
          aria-modal
          aria-labelledby="add-service-modal-title"
        >
          <div
            className="my-4 w-full max-w-lg max-h-[min(92dvh,720px)] min-h-0 rounded-xl border shadow-lg flex flex-col bg-white ring-1 ring-black/5"
            style={{ borderColor: 'hsl(215 20% 88%)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 border-b shrink-0 bg-slate-100"
              style={{ borderColor: 'hsl(215 20% 88%)' }}
            >
              <h2
                id="add-service-modal-title"
                className="text-base font-semibold m-0"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Add service entry
              </h2>
              <p className="text-xs text-slate-600 m-0 mt-1">
                {customer?.name ? `Log completed work for ${customer.name}` : 'Record service date, details, and optional files'}
              </p>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              <ServiceEntryForm
                customerId={safeCustomerId}
                onAdded={async () => {
                  setActionError(null)
                  await queryClient.invalidateQueries({ queryKey: ['customer-services', safeCustomerId], exact: false })
                  setAddServiceModalOpen(false)
                }}
                onError={(msg) => setActionError(msg)}
                onCancel={() => setAddServiceModalOpen(false)}
              />
            </div>
          </div>
        </ModalScrollBackdrop>
      ) : null}

      {addNoteModalOpen ? (
        <ModalScrollBackdrop
          onBackdropClose={() => setAddNoteModalOpen(false)}
          zClass="z-[70]"
          role="dialog"
          aria-modal
          aria-labelledby="add-note-modal-title"
        >
          <div
            className="my-4 w-full max-w-lg max-h-[min(92dvh,720px)] min-h-0 rounded-xl border shadow-lg flex flex-col bg-white ring-1 ring-black/5"
            style={{ borderColor: 'hsl(215 20% 88%)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 border-b shrink-0 bg-slate-100"
              style={{ borderColor: 'hsl(215 20% 88%)' }}
            >
              <h2
                id="add-note-modal-title"
                className="text-base font-semibold m-0"
                style={{ color: 'var(--crm-content-header-text)' }}
              >
                Add note
              </h2>
              <p className="text-xs text-slate-600 m-0 mt-1">
                {customer?.name ? `Log activity for ${customer.name}` : 'Create a customer note'}
              </p>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              <CustomerNoteComposer
                customerId={safeCustomerId}
                onAdded={async () => {
                  setActionError(null)
                  await queryClient.invalidateQueries({
                    queryKey: ['customer-notes', safeCustomerId],
                    exact: false,
                  })
                  setAddNoteModalOpen(false)
                }}
                onError={(msg) => setActionError(msg)}
                onCancel={() => setAddNoteModalOpen(false)}
              />
            </div>
          </div>
        </ModalScrollBackdrop>
      ) : null}

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div
          className="px-4 sm:px-5 py-3 border-b bg-slate-100"
          style={{ borderColor: 'hsl(215 20% 88%)' }}
        >
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Activity log
          </div>
          <p className="text-xs text-slate-600 m-0 mt-0.5">
            Recent actions ({ACTIVITY_PAGE_SIZE} per page)
          </p>
        </div>

        <div className="p-4 sm:p-5">
        {activityError ? (
          <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load activity: {String((activityError as Error).message)}
          </div>
        ) : isActivityPending ? (
          <div className="text-sm text-slate-600">Loading activity...</div>
        ) : activityTotal === 0 ? (
          <div className="text-sm text-slate-600">No activity yet.</div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {(activity ?? []).map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-colors hover:bg-slate-50/80"
                  style={{ borderColor: 'hsl(215 20% 88%)' }}
                >
                  <div className="min-w-0">
                    <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
                      {evt.summary}
                    </div>
                    <div className="text-xs text-slate-500">{new Date(evt.created_at).toLocaleString()}</div>
                  </div>
                  {evt.target_path ? (
                    <Link
                      to={evt.target_path}
                      className="rounded-md px-2 py-1 text-xs font-semibold border-2 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50 no-underline self-start sm:self-auto"
                      style={{
                        color: 'var(--crm-content-header-text)',
                        borderColor: 'hsl(215 22% 55%)',
                      }}
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
            <div
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4"
              style={{ borderColor: 'hsl(215 20% 88%)' }}
            >
              <p className="text-xs text-slate-600 m-0">
                Showing{' '}
                <span className="font-semibold tabular-nums text-slate-800">{activityShowingFrom}</span>
                –
                <span className="font-semibold tabular-nums text-slate-800">{activityShowingTo}</span>
                {' of '}
                <span className="font-semibold tabular-nums text-slate-800">{activityTotal}</span>
              </p>
              {activityPageCount > 1 ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-xs font-semibold border-2 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed"
                    style={{
                      color: 'var(--crm-content-header-text)',
                      borderColor: 'hsl(215 22% 55%)',
                    }}
                    disabled={activityPage <= 0}
                    onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-xs font-semibold border-2 bg-white cursor-pointer transition-colors duration-150 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed"
                    style={{
                      color: 'var(--crm-content-header-text)',
                      borderColor: 'hsl(215 22% 55%)',
                    }}
                    disabled={activityPage >= activityPageCount - 1}
                    onClick={() => setActivityPage((p) => Math.min(activityPageCount - 1, p + 1))}
                  >
                    Next
                  </button>
                  <span className="text-xs text-slate-500 self-center tabular-nums">
                    Page {activityPage + 1} / {activityPageCount}
                  </span>
                </div>
              ) : null}
            </div>
          </>
        )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteCustomer && Boolean(customer)}
        onClose={() => setConfirmDeleteCustomer(false)}
        title="Delete customer?"
        description={
          customer ? (
            <>
              Permanently delete <strong>{customer.name}</strong>? This cannot be undone.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!customer) return
          await deleteCustomer(customer.id)
          await queryClient.invalidateQueries({ queryKey: ['customers'], exact: false })
          navigate('/customers')
        }}
      />

      <ConfirmDialog
        open={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        title="Delete this note?"
        description="This note will be permanently removed."
        onConfirm={async () => {
          if (!noteToDelete) return
          setActionError(null)
          try {
            await deleteCustomerNote(noteToDelete)
            await queryClient.invalidateQueries({
              queryKey: ['customer-notes', safeCustomerId],
              exact: false,
            })
          } catch (err) {
            setActionError(String((err as Error).message ?? err))
            throw err
          }
        }}
      />

      <ConfirmDialog
        open={serviceToDelete !== null}
        onClose={() => setServiceToDelete(null)}
        title="Delete service entry?"
        description="This removes the service history entry and any attached images from storage."
        onConfirm={async () => {
          if (!serviceToDelete) return
          setActionError(null)
          try {
            await deleteServiceEntryWithImages(serviceToDelete)
            await queryClient.invalidateQueries({
              queryKey: ['customer-services', safeCustomerId],
              exact: false,
            })
          } catch (e) {
            setActionError(String((e as Error).message ?? e))
            throw e
          }
        }}
      />
    </div>
  )
}


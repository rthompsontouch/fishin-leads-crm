import { useEffect, useState } from 'react'
import { Download, HelpCircle, Mail, Phone, Plus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import TablePagination from '../components/TablePagination'
import { CallLinkCell, EmailLinkCell } from '../components/ContactActionButtons'
import ExportDataModal from '../components/ExportDataModal'
import TableSkeleton from '../components/TableSkeleton'
import { listLeadsForExport, listLeadsPaged } from '../features/leads/api/leadsApi'
import { LEAD_EXPORT_FIELDS, runLeadExport } from '../lib/exportLeadsCsv'

const LEADS_PAGE_SIZE = 10

/** Dot + legend colors (matches row styling). */
const LEAD_STATUS_LEGEND: Array<{ label: string; color: string }> = [
  { label: 'New', color: 'var(--color-info)' },
  { label: 'Contacted', color: 'var(--color-accent)' },
  { label: 'Quoted', color: 'var(--color-warning)' },
  { label: 'Won', color: 'var(--color-success)' },
  { label: 'Lost', color: 'var(--color-danger)' },
]

function leadStatusDotColor(status: string): string {
  switch (status) {
    case 'Won':
    case 'ClosedWon':
      return 'var(--color-success)'
    case 'Lost':
    case 'ClosedLost':
      return 'var(--color-danger)'
    case 'New':
      return 'var(--color-info)'
    case 'Quoted':
      return 'var(--color-warning)'
    case 'Contacted':
      return 'var(--color-accent)'
    case 'Qualified':
      return 'var(--color-success)'
    case 'Unqualified':
      return 'var(--color-warning)'
    default:
      return 'var(--color-accent)'
  }
}

function LeadStatusLegendMobile() {
  return (
    <details className="relative z-20">
      <summary
        className="list-none cursor-pointer rounded-md p-1 text-slate-500 outline-none transition-colors hover:bg-slate-200/80 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] [&::-webkit-details-marker]:hidden"
        aria-label="What status colors mean"
      >
        <HelpCircle size={17} strokeWidth={2.25} aria-hidden />
      </summary>
      <div
        className="absolute right-0 top-[calc(100%+0.35rem)] w-[min(calc(100vw-2rem),14rem)] rounded-lg border bg-white p-3 text-left text-xs shadow-lg"
        style={{
          borderColor: 'hsl(215 22% 82%)',
          color: 'var(--crm-content-header-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold mb-2 text-sm">Status colors</div>
        <ul className="m-0 list-none space-y-2 p-0">
          {LEAD_STATUS_LEGEND.map((row) => (
            <li key={row.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ background: row.color }}
                aria-hidden
              />
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

export default function LeadsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'uncontacted'>(() =>
    searchParams.get('filter') === 'uncontacted' ? 'uncontacted' : 'all',
  )

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    setFilter(searchParams.get('filter') === 'uncontacted' ? 'uncontacted' : 'all')
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const {
    data: paged,
    isPending,
    error,
  } = useQuery({
    queryKey: [
      'leads',
      'paged',
      {
        filter,
        search: debouncedSearch,
        page,
        pageSize: LEADS_PAGE_SIZE,
      },
    ],
    queryFn: () =>
      listLeadsPaged({
        page,
        pageSize: LEADS_PAGE_SIZE,
        uncontactedOnly: filter === 'uncontacted',
        search: debouncedSearch,
      }),
    placeholderData: keepPreviousData,
  })

  const total = paged?.total ?? 0
  const pageRows = paged?.rows ?? []
  const totalPages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const showInitialLoading = isPending && !paged

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <h1 className="crm-page-header-title">Leads</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => {
              navigate('/leads/new')
            }}
            disabled={showInitialLoading}
          >
            <Plus size={18} className="shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
            Add Lead
          </button>
          <button
            type="button"
            className="crm-dashboard-export-stats inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => setExportOpen(true)}
            disabled={showInitialLoading}
            title="Export leads matching your filters and search"
          >
            Export
            <Download size={18} className="shrink-0 opacity-95" aria-hidden />
          </button>
        </div>
      </div>

      <p
        className="text-sm m-0 leading-relaxed -mt-0.5"
        style={{ color: 'var(--crm-content-header-text)' }}
      >
        Want to import your leads automatically from your website&apos;s forms?{' '}
        <Link
          to="/integrations/leads"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          Click here
        </Link>
      </p>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div
          className="flex flex-col gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-row items-center justify-between gap-3 min-w-0">
            <div
              className="text-lg font-bold tracking-tight min-w-0 md:text-sm md:font-semibold md:tracking-normal"
              style={{ color: 'var(--crm-content-header-text)' }}
            >
              Lead list
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 min-h-10 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 ${
                  filter === 'all'
                    ? 'bg-[color:var(--color-primary)] text-white border-transparent hover:bg-[color:var(--color-primary-dark)] shadow-sm'
                    : 'bg-white hover:bg-slate-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={
                  filter === 'all'
                    ? undefined
                    : {
                        color: 'var(--crm-content-header-text)',
                        borderColor: 'hsl(215 22% 55%)',
                      }
                }
                onClick={() => setFilter('all')}
                disabled={showInitialLoading}
              >
                All
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 min-h-10 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 ${
                  filter === 'uncontacted'
                    ? 'bg-[color:var(--color-primary)] text-white border-transparent hover:bg-[color:var(--color-primary-dark)] shadow-sm'
                    : 'bg-white hover:bg-slate-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={
                  filter === 'uncontacted'
                    ? undefined
                    : {
                        color: 'var(--crm-content-header-text)',
                        borderColor: 'hsl(215 22% 55%)',
                      }
                }
                onClick={() => setFilter('uncontacted')}
                disabled={showInitialLoading}
              >
                Uncontacted
              </button>
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-md border-2 bg-white px-3 py-2.5 text-sm outline-none min-w-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1 placeholder:text-slate-500"
            style={{
              borderColor: 'hsl(215 22% 72%)',
              color: 'var(--crm-content-header-text)',
            }}
            disabled={showInitialLoading}
          />
        </div>

        <div
          className="grid max-md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-7 gap-2 bg-slate-100 p-3 text-sm font-semibold"
          style={{ color: 'var(--crm-content-header-text)' }}
        >
          <div className="truncate min-w-0">Name</div>
          <div className="hidden md:block truncate min-w-0">Company</div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Mail size={15} className="shrink-0 opacity-80 md:hidden" aria-hidden />
            <span className="truncate text-xs font-bold md:text-sm md:font-semibold">Email</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Phone size={15} className="shrink-0 opacity-80 md:hidden" aria-hidden />
            <span className="truncate text-xs font-bold md:text-sm md:font-semibold">Phone</span>
          </div>
          <div className="flex items-center justify-end gap-1 min-w-0 md:justify-start">
            <span className="truncate text-xs font-bold md:text-sm md:font-semibold">Status</span>
            <div className="md:hidden shrink-0">
              <LeadStatusLegendMobile />
            </div>
          </div>
          <div className="hidden md:block truncate min-w-0">Last Contacted</div>
          <div className="hidden md:block truncate min-w-0">Created</div>
        </div>

        {showInitialLoading ? (
          <TableSkeleton rows={7} columns={7} />
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load leads. {String((error as Error).message)}
          </div>
        ) : total === 0 && debouncedSearch.trim() ? (
          <div className="p-6">
            <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
              No leads match your search.
            </div>
            <div className="text-xs mt-2 text-slate-600">
              Try a different name, company, email, or status.
            </div>
          </div>
        ) : total > 0 ? (
          <>
            <div className="px-2 pt-2 pb-0">
              {pageRows.map((lead, idx) => {
                const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
                const label = name || lead.company || 'Lead'
                const lastContacted =
                  lead.last_contacted_at === null
                    ? '—'
                    : new Date(lead.last_contacted_at).toLocaleDateString()
                const created = new Date(lead.created_at).toLocaleDateString()
                const statusColor = leadStatusDotColor(lead.status as string)
                const isLast = idx === pageRows.length - 1
                const stripe = idx % 2 === 1 ? 'bg-slate-50/95' : 'bg-white'
                return (
                  <div
                    key={lead.id}
                    className={[
                      'grid max-md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-7 gap-2 px-3 py-3 min-h-[3.25rem] items-center border-b transition-colors',
                      stripe,
                      'hover:bg-slate-100/90',
                      isLast ? 'border-b-0' : '',
                    ].join(' ')}
                    style={{ borderColor: 'hsl(215 20% 88%)', color: 'var(--crm-content-header-text)' }}
                  >
                    <Link
                      to={`/leads/${lead.id}`}
                      className="truncate text-base md:text-sm font-semibold min-w-0 no-underline hover:underline underline-offset-2"
                      style={{ color: 'var(--crm-content-header-text)' }}
                    >
                      {name || '—'}
                    </Link>
                    <div className="hidden md:block truncate text-sm text-slate-700 min-w-0">
                      {lead.company || '—'}
                    </div>
                    <div className="min-w-0 flex w-full items-center md:justify-start">
                      <EmailLinkCell email={lead.email} contactLabel={label} iconOnlyMobile />
                    </div>
                    <div className="min-w-0 flex w-full items-center md:justify-start">
                      <CallLinkCell phone={lead.phone} iconOnlyMobile />
                    </div>
                    <div className="flex min-w-0 items-center justify-end md:justify-start">
                      <span
                        className="hidden md:inline-flex rounded-full px-2.5 py-1.5 max-w-full text-sm font-semibold"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                          border: '1px solid hsl(215 22% 78%)',
                        }}
                      >
                        <span className="truncate" style={{ color: statusColor }}>
                          {lead.status}
                        </span>
                      </span>
                      <span
                        className="md:hidden inline-flex h-5 w-5 shrink-0 rounded-full border border-black/15"
                        style={{ background: statusColor }}
                        title={lead.status}
                        aria-label={`Status: ${lead.status}`}
                      />
                    </div>
                    <div className="hidden md:block truncate text-sm text-slate-700 min-w-0">
                      {lastContacted}
                    </div>
                    <div className="hidden md:block truncate text-sm text-slate-600 min-w-0">
                      {created}
                    </div>
                  </div>
                )
              })}
            </div>
            <TablePagination
              page={safePage}
              pageSize={LEADS_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="p-6">
            <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
              No {filter === 'uncontacted' ? 'uncontacted' : 'leads'} found.
            </div>
            <div className="text-xs mt-2 text-slate-600">
              {filter === 'uncontacted'
                ? 'When you add call/email/meeting notes for a lead, it will leave Uncontacted (because last_contacted_at becomes non-null).'
                : 'Add your first lead, or use Click here above to connect website forms.'}
            </div>
          </div>
        )}
      </div>

      <ExportDataModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export leads"
        rowCount={total}
        exportFields={LEAD_EXPORT_FIELDS}
        onRunExport={async (opts) => {
          const rows = await listLeadsForExport({
            uncontactedOnly: filter === 'uncontacted',
            search: debouncedSearch,
          })
          runLeadExport(rows, opts)
        }}
      />
    </div>
  )
}

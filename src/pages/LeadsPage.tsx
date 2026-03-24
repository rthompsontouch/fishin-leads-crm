import { useEffect, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import TablePagination from '../components/TablePagination'
import { CallLinkCell, EmailLinkCell } from '../components/ContactActionButtons'
import ExportDataModal from '../components/ExportDataModal'
import { listLeadsForExport, listLeadsPaged } from '../features/leads/api/leadsApi'
import { LEAD_EXPORT_FIELDS, runLeadExport } from '../lib/exportLeadsCsv'

const LEADS_PAGE_SIZE = 10

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
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Lead list
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:justify-end">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full sm:max-w-xs rounded-md border-2 bg-white px-3 py-2 text-sm outline-none min-w-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1 placeholder:text-slate-500"
              style={{
                borderColor: 'hsl(215 22% 72%)',
                color: 'var(--crm-content-header-text)',
              }}
              disabled={showInitialLoading}
            />
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                className={`rounded-lg px-4 py-2.5 min-h-11 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 ${
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
                className={`rounded-lg px-4 py-2.5 min-h-11 text-sm font-semibold cursor-pointer transition-colors duration-150 border-2 ${
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
        </div>

        <div
          className="grid grid-cols-4 md:grid-cols-7 gap-2 bg-slate-100 p-3 text-sm font-semibold"
          style={{ color: 'var(--crm-content-header-text)' }}
        >
          <div className="truncate min-w-0">Name</div>
          <div className="hidden md:block truncate min-w-0">Company</div>
          <div className="truncate min-w-0">Email</div>
          <div className="truncate min-w-0">Phone</div>
          <div className="truncate min-w-0">Status</div>
          <div className="hidden md:block truncate min-w-0">Last Contacted</div>
          <div className="hidden md:block truncate min-w-0">Created</div>
        </div>

        {showInitialLoading ? (
          <div className="p-6 text-sm" style={{ color: 'var(--crm-content-header-text)', opacity: 0.85 }}>
            Loading leads...
          </div>
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
                const statusColor =
                  (lead.status as any) === 'Won'
                    ? 'var(--color-success)'
                    : (lead.status as any) === 'Lost'
                      ? 'var(--color-danger)'
                      : (lead.status as any) === 'New'
                        ? 'var(--color-info)'
                        : 'var(--color-accent)'
                const isLast = idx === pageRows.length - 1
                return (
                  <div
                    key={lead.id}
                    className={`grid grid-cols-4 md:grid-cols-7 gap-2 px-3 py-3 min-h-[3.25rem] items-center border-b transition-colors hover:bg-slate-50 ${isLast ? 'border-b-0' : ''}`}
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
                    <div className="min-w-0 flex items-center">
                      <EmailLinkCell email={lead.email} contactLabel={label} />
                    </div>
                    <div className="min-w-0 flex items-center">
                      <CallLinkCell phone={lead.phone} />
                    </div>
                    <div className="text-sm font-semibold min-w-0">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1.5 max-w-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                          border: '1px solid hsl(215 22% 78%)',
                        }}
                      >
                        <span className="truncate" style={{ color: statusColor }}>
                          {lead.status}
                        </span>
                      </span>
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

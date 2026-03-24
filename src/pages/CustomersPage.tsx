import { useEffect, useState } from 'react'
import { Download, HelpCircle, Mail, Phone, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import TablePagination from '../components/TablePagination'
import { CallLinkCell, EmailLinkCell } from '../components/ContactActionButtons'
import ExportDataModal from '../components/ExportDataModal'
import {
  listCustomersForExport,
  listCustomersPaged,
} from '../features/customers/api/customersApi'
import { CUSTOMER_EXPORT_FIELDS, runCustomerExport } from '../lib/exportCustomersCsv'

const CUSTOMERS_PAGE_SIZE = 10

const CUSTOMER_STATUS_LEGEND: Array<{ label: string; color: string }> = [
  { label: 'Prospect', color: 'var(--color-accent)' },
  { label: 'Active', color: 'var(--color-success)' },
  { label: 'OnHold', color: 'var(--color-info)' },
  { label: 'Churned', color: 'var(--color-danger)' },
]

function customerStatusDotColor(status: string): string {
  switch (status) {
    case 'Active':
      return 'var(--color-success)'
    case 'Churned':
      return 'var(--color-danger)'
    case 'OnHold':
      return 'var(--color-info)'
    case 'Prospect':
    default:
      return 'var(--color-accent)'
  }
}

function CustomerStatusLegendMobile() {
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
          {CUSTOMER_STATUS_LEGEND.map((row) => (
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

export default function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const {
    data: paged,
    isPending,
    error,
  } = useQuery({
    queryKey: [
      'customers',
      'paged',
      {
        search: debouncedSearch,
        page,
        pageSize: CUSTOMERS_PAGE_SIZE,
      },
    ],
    queryFn: () =>
      listCustomersPaged({
        page,
        pageSize: CUSTOMERS_PAGE_SIZE,
        search: debouncedSearch,
      }),
    placeholderData: keepPreviousData,
  })

  const total = paged?.total ?? 0
  const pageRows = paged?.rows ?? []
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const showInitialLoading = isPending && !paged

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-page-header crm-page-header--white crm-page-header--compact">
        <h1 className="crm-page-header-title">Customers</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => navigate('/customers/new')}
            disabled={showInitialLoading}
          >
            <Plus size={18} className="shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
            Add Customer
          </button>
          <button
            type="button"
            className="crm-dashboard-export-stats inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => setExportOpen(true)}
            disabled={showInitialLoading}
            title="Export customers matching your search"
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
        Convert a closed deal from your pipeline into a customer record from any lead.{' '}
        <Link
          to="/leads"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          View leads
        </Link>
      </p>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="text-sm font-semibold md:text-sm max-md:text-lg max-md:font-bold"
            style={{ color: 'var(--crm-content-header-text)' }}
          >
            Customer list
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:justify-end">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full sm:max-w-xs rounded-md border-2 bg-white px-3 py-2 text-sm outline-none min-w-0 focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1 placeholder:text-slate-500"
              style={{
                borderColor: 'hsl(215 22% 72%)',
                color: 'var(--crm-content-header-text)',
              }}
              disabled={showInitialLoading}
            />
          </div>
        </div>

        <div
          className="grid max-md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-6 gap-2 bg-slate-100 p-3 text-sm font-semibold"
          style={{ color: 'var(--crm-content-header-text)' }}
        >
          <div className="truncate min-w-0">Name</div>
          <div className="hidden md:block truncate min-w-0">Primary contact</div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Mail size={15} className="shrink-0 opacity-80 md:hidden" aria-hidden />
            <span className="truncate text-xs font-bold md:text-sm md:font-semibold">Email</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Phone size={15} className="shrink-0 opacity-80 md:hidden" aria-hidden />
            <span className="truncate text-xs font-bold md:text-sm md:font-semibold">Phone</span>
          </div>
          <div className="hidden md:block truncate min-w-0">Industry</div>
          <div className="flex items-center justify-end gap-1 min-w-0 md:justify-start">
            <span className="truncate text-xs font-bold md:text-sm md:font-semibold">Status</span>
            <div className="md:hidden shrink-0">
              <CustomerStatusLegendMobile />
            </div>
          </div>
        </div>

        {showInitialLoading ? (
          <div className="p-6 text-sm" style={{ color: 'var(--crm-content-header-text)', opacity: 0.85 }}>
            Loading customers...
          </div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load customers. {String((error as Error).message)}
          </div>
        ) : total === 0 && debouncedSearch.trim() ? (
          <div className="p-6">
            <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
              No customers match your search.
            </div>
            <div className="text-xs mt-2 text-slate-600">
              Try another name, email, phone, or industry.
            </div>
          </div>
        ) : total > 0 ? (
          <>
            <div className="px-2 pt-2 pb-0">
              {pageRows.map((c, idx) => {
                const contact = [c.primary_first_name, c.primary_last_name].filter(Boolean).join(' ')
                const statusColor = customerStatusDotColor(c.status as string)
                const isLast = idx === pageRows.length - 1
                const stripe = idx % 2 === 1 ? 'bg-slate-50/95' : 'bg-white'
                return (
                  <div
                    key={c.id}
                    className={[
                      'grid max-md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-6 gap-2 px-3 py-3 min-h-[3.25rem] items-center border-b transition-colors',
                      stripe,
                      'hover:bg-slate-100/90',
                      isLast ? 'border-b-0' : '',
                    ].join(' ')}
                    style={{ borderColor: 'hsl(215 20% 88%)', color: 'var(--crm-content-header-text)' }}
                  >
                    <Link
                      to={`/customers/${c.id}`}
                      className="truncate text-base md:text-sm font-semibold min-w-0 no-underline hover:underline underline-offset-2"
                      style={{ color: 'var(--crm-content-header-text)' }}
                    >
                      {c.name}
                    </Link>
                    <div className="hidden md:block truncate text-sm text-slate-700 min-w-0">
                      {contact || '—'}
                    </div>
                    <div className="min-w-0 flex w-full items-center md:justify-start">
                      <EmailLinkCell email={c.primary_email} contactLabel={c.name} iconOnlyMobile />
                    </div>
                    <div className="min-w-0 flex w-full items-center md:justify-start">
                      <CallLinkCell phone={c.primary_phone} iconOnlyMobile />
                    </div>
                    <div className="hidden md:block truncate text-sm text-slate-700 min-w-0">
                      {c.industry || '—'}
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
                          {c.status}
                        </span>
                      </span>
                      <span
                        className="md:hidden inline-flex h-5 w-5 shrink-0 rounded-full border border-black/15"
                        style={{ background: statusColor }}
                        title={c.status}
                        aria-label={`Status: ${c.status}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <TablePagination
              page={safePage}
              pageSize={CUSTOMERS_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="p-6">
            <div className="text-sm" style={{ color: 'var(--crm-content-header-text)' }}>
              No customers found.
            </div>
            <div className="text-xs mt-2 text-slate-600">
              Add your first customer, or convert from a lead on the Leads page.
            </div>
          </div>
        )}
      </div>

      <ExportDataModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export customers"
        rowCount={total}
        exportFields={CUSTOMER_EXPORT_FIELDS}
        onRunExport={async (opts) => {
          const rows = await listCustomersForExport({ search: debouncedSearch })
          runCustomerExport(rows, opts)
        }}
      />
    </div>
  )
}

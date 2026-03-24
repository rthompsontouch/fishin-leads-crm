import { useEffect, useState } from 'react'
import { Download, Plus } from 'lucide-react'
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
            className="text-sm font-semibold"
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
          className="grid grid-cols-4 md:grid-cols-6 gap-2 bg-slate-100 p-3 text-sm font-semibold"
          style={{ color: 'var(--crm-content-header-text)' }}
        >
          <div className="truncate min-w-0">Name</div>
          <div className="hidden md:block truncate min-w-0">Primary contact</div>
          <div className="truncate min-w-0">Email</div>
          <div className="truncate min-w-0">Phone</div>
          <div className="hidden md:block truncate min-w-0">Industry</div>
          <div className="truncate min-w-0">Status</div>
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
                const statusColor =
                  c.status === 'Active'
                    ? 'var(--color-success)'
                    : c.status === 'Churned'
                      ? 'var(--color-danger)'
                      : c.status === 'OnHold'
                        ? 'var(--color-info)'
                        : 'var(--color-accent)'
                const isLast = idx === pageRows.length - 1
                return (
                  <div
                    key={c.id}
                    className={`grid grid-cols-4 md:grid-cols-6 gap-2 px-3 py-3 min-h-[3.25rem] items-center border-b transition-colors hover:bg-slate-50 ${isLast ? 'border-b-0' : ''}`}
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
                    <div className="min-w-0 flex items-center">
                      <EmailLinkCell email={c.primary_email} contactLabel={c.name} />
                    </div>
                    <div className="min-w-0 flex items-center">
                      <CallLinkCell phone={c.primary_phone} />
                    </div>
                    <div className="hidden md:block truncate text-sm text-slate-700 min-w-0">
                      {c.industry || '—'}
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
                          {c.status}
                        </span>
                      </span>
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

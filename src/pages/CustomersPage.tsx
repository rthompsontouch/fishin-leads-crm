import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import TablePagination, { DEFAULT_PAGE_SIZE } from '../components/TablePagination'
import ExportDataModal from '../components/ExportDataModal'
import { listCustomers } from '../features/customers/api/customersApi'
import { runCustomerCsvDownload } from '../lib/exportCustomersCsv'

export default function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)

  const { data: customers, isPending, error } = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers(),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers ?? []

    return (customers ?? []).filter((c) => {
      const contact = [c.primary_first_name, c.primary_last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (
        (c.name ?? '').toLowerCase().includes(q) ||
        contact.includes(q) ||
        (c.primary_email ?? '').toLowerCase().includes(q) ||
        (c.primary_phone ?? '').toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q) ||
        (c.status ?? '').toLowerCase().includes(q)
      )
    })
  }, [customers, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / DEFAULT_PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * DEFAULT_PAGE_SIZE
    return filtered.slice(start, start + DEFAULT_PAGE_SIZE)
  }, [filtered, safePage])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm opacity-80 mt-1">
            Manage customer records, notes, and service history.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => navigate('/customers/new')}
            disabled={isPending}
          >
            Add Customer
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full rounded-md border px-3 py-2 outline-none"
          style={{ borderColor: 'var(--color-border)' }}
        />
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="grid grid-cols-6 bg-[color:var(--color-surface-1)] p-3 text-xs font-semibold">
          <div>Name</div>
          <div>Primary contact</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Industry</div>
          <div>Status</div>
        </div>

        {isPending ? (
          <div className="p-6 text-sm opacity-80">Loading customers...</div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load customers. {String((error as Error).message)}
          </div>
        ) : customers && customers.length > 0 && totalFiltered === 0 ? (
          <div className="p-6">
            <div className="text-sm opacity-80">No customers match your search.</div>
            <div className="text-xs opacity-70 mt-2">Try another name, email, phone, or industry.</div>
          </div>
        ) : totalFiltered > 0 ? (
          <>
            <div className="flex flex-col">
              {pageRows.map((c) => {
                return (
                  <Link
                    key={c.id}
                    to={`/customers/${c.id}`}
                    className="grid grid-cols-6 gap-2 px-3 py-3 items-center border-b"
                    style={{
                      borderColor: 'var(--color-border)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="truncate text-sm opacity-90">
                      {[c.primary_first_name, c.primary_last_name].filter(Boolean).join(' ') || '—'}
                    </div>
                    <div className="truncate text-sm opacity-90">{c.primary_email || '—'}</div>
                    <div className="truncate text-sm opacity-90">{c.primary_phone || '—'}</div>
                    <div className="truncate text-sm opacity-90">{c.industry || '—'}</div>
                    <div className="truncate text-sm opacity-70">{c.status}</div>
                  </Link>
                )
              })}
            </div>
            <TablePagination
              page={safePage}
              pageSize={DEFAULT_PAGE_SIZE}
              total={totalFiltered}
              onPageChange={setPage}
            />
          </>
        ) : (
          <div className="p-6">
            <div className="text-sm opacity-80">No customers found.</div>
            <div className="text-xs opacity-70 mt-2">
              Add your first customer, or convert from a lead.
            </div>
          </div>
        )}
      </div>

      <ExportDataModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export customers (CSV)"
        rowCount={totalFiltered}
        onRunExport={(opts) => runCustomerCsvDownload(filtered, opts)}
      />
    </div>
  )
}


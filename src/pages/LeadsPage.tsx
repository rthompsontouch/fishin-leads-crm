import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import TablePagination, { DEFAULT_PAGE_SIZE } from '../components/TablePagination'
import ExportDataModal from '../components/ExportDataModal'
import { listLeads } from '../features/leads/api/leadsApi'
import { runLeadCsvDownload } from '../lib/exportLeadsCsv'

export default function LeadsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const columns = useMemo(
    () => [
      'Name',
      'Company',
      'Email',
      'Phone',
      'Status',
      'Last Contacted',
      'Created',
    ],
    [],
  )

  const [filter, setFilter] = useState<'all' | 'uncontacted'>(() =>
    searchParams.get('filter') === 'uncontacted' ? 'uncontacted' : 'all',
  )

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    setFilter(searchParams.get('filter') === 'uncontacted' ? 'uncontacted' : 'all')
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  const {
    data: leads,
    isPending,
    error,
  } = useQuery({
    queryKey: ['leads', { filter }],
    queryFn: () =>
      listLeads({
        uncontactedOnly: filter === 'uncontacted',
      }),
  })

  const filtered = useMemo(() => {
    const list = leads ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list

    return list.filter((lead) => {
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ').toLowerCase()
      return (
        name.includes(q) ||
        (lead.company ?? '').toLowerCase().includes(q) ||
        (lead.email ?? '').toLowerCase().includes(q) ||
        (lead.phone ?? '').toLowerCase().includes(q) ||
        (lead.status ?? '').toLowerCase().includes(q) ||
        (lead.source ?? '').toLowerCase().includes(q)
      )
    })
  }, [leads, search])

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm opacity-80 mt-1">
            Manage leads, notes, and your contact pipeline.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/integrations"
            className="rounded-md px-3 py-2 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] inline-flex items-center justify-center no-underline"
          >
            Add via Integrations
          </Link>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => {
              navigate('/leads/new')
            }}
            disabled={isPending}
          >
            Add Lead
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b">
          <div className="text-sm font-semibold">Lead list</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 min-w-0 flex-1 sm:flex-initial sm:justify-end">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full sm:max-w-xs rounded-md border px-3 py-2 text-sm outline-none min-w-0"
              style={{ borderColor: 'var(--color-border)' }}
              disabled={isPending}
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer transition-colors duration-150 border border-transparent ${
                  filter === 'all'
                    ? 'bg-[color:var(--color-primary)] text-white hover:bg-[color:var(--color-primary-dark)]'
                    : 'bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] border-[color:var(--color-border)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={() => setFilter('all')}
                disabled={isPending}
              >
                All
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1 text-xs font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] ${
                  filter === 'uncontacted'
                    ? 'bg-[color:var(--color-primary)] text-white border-transparent hover:bg-[color:var(--color-primary-dark)]'
                    : 'bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={() => setFilter('uncontacted')}
                disabled={isPending}
              >
                Uncontacted
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 bg-[color:var(--color-surface-1)] p-3 text-xs font-semibold">
          {columns.map((c) => (
            <div key={c} className="truncate">
              {c}
            </div>
          ))}
        </div>

        {isPending ? (
          <div className="p-6 text-sm opacity-80">Loading leads...</div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: 'var(--color-danger)' }}>
            Failed to load leads. {String((error as Error).message)}
          </div>
        ) : leads && leads.length > 0 && totalFiltered === 0 ? (
          <div className="p-6">
            <div className="text-sm opacity-80">No leads match your search.</div>
            <div className="text-xs opacity-70 mt-2">Try a different name, company, email, or status.</div>
          </div>
        ) : leads && leads.length > 0 ? (
          <>
            <div className="p-2">
              {pageRows.map((lead) => {
                const name = [lead.first_name, lead.last_name]
                  .filter(Boolean)
                  .join(' ')
                const lastContacted =
                  lead.last_contacted_at === null
                    ? '—'
                    : new Date(lead.last_contacted_at).toLocaleDateString()

                const created = new Date(lead.created_at).toLocaleDateString()

                const statusColor =
                  lead.status === 'Qualified'
                    ? 'var(--color-success)'
                    : lead.status === 'New'
                      ? 'var(--color-info)'
                      : 'var(--color-accent)'

                return (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="grid grid-cols-7 gap-2 px-3 py-3 items-center border-b"
                    style={{
                      borderColor: 'var(--color-border)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div className="truncate text-sm font-semibold">{name || '—'}</div>
                    <div className="truncate text-sm opacity-90">{lead.company || '—'}</div>
                    <div className="truncate text-sm opacity-90">{lead.email || '—'}</div>
                    <div className="truncate text-sm opacity-90">{lead.phone || '—'}</div>
                    <div className="text-xs font-semibold">
                      <span
                        className="inline-flex rounded-full px-2 py-1"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <span style={{ color: statusColor }}>{lead.status}</span>
                      </span>
                    </div>
                    <div className="truncate text-sm opacity-90">{lastContacted}</div>
                    <div className="truncate text-sm opacity-70">{created}</div>
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
            <div className="text-sm opacity-80">
              No {filter === 'uncontacted' ? 'uncontacted' : 'leads'} found.
            </div>
            <div className="text-xs opacity-70 mt-2">
              {filter === 'uncontacted'
                ? 'When you add call/email/meeting notes for a lead, it will leave Uncontacted (because last_contacted_at becomes non-null).'
                : 'Add your first lead, or create one via Integrations.'}
            </div>
          </div>
        )}
      </div>

      <ExportDataModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export leads (CSV)"
        rowCount={totalFiltered}
        onRunExport={(opts) => runLeadCsvDownload(filtered, opts)}
      />
    </div>
  )
}

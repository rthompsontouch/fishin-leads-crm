const btnOutline =
  'cursor-pointer rounded-lg px-4 py-2.5 min-h-11 text-sm font-semibold border-2 transition-colors duration-150 border-[hsl(215_22%_72%)] bg-white text-[color:var(--crm-content-header-text)] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white'

export const DEFAULT_PAGE_SIZE = 15

type TablePaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export default function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: TablePaginationProps) {
  if (total <= 0) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  const safePage = Math.min(Math.max(1, page), totalPages)
  const from = (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t text-sm"
      style={{
        borderColor: 'hsl(215 20% 88%)',
        color: 'var(--crm-content-header-text)',
      }}
    >
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnOutline}
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </button>
        <span className="tabular-nums text-slate-600">
          Page {safePage} / {totalPages}
        </span>
        <button
          type="button"
          className={btnOutline}
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

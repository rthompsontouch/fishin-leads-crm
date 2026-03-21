const btnOutline =
  'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold border transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'

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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t text-xs opacity-90"
      style={{ borderColor: 'var(--color-border)' }}
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
        <span className="tabular-nums opacity-80">
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

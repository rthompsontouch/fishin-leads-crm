import { useEffect, useState } from 'react'
import type { FlexibleExportInput } from '../lib/csvExport'

const outlineBtn =
  'rounded-md px-3 py-1.5 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]'
const primaryBtn =
  'rounded-md px-3 py-1.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed'

type ExportDataModalProps = {
  open: boolean
  onClose: () => void
  title: string
  /** Rows that match current search / filters (export uses this set). */
  rowCount: number
  onRunExport: (options: FlexibleExportInput) => void | Promise<void>
}

function parseOptionalPositiveInt(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return undefined
  return n
}

export default function ExportDataModal({
  open,
  onClose,
  title,
  rowCount,
  onRunExport,
}: ExportDataModalProps) {
  const [maxRowsInput, setMaxRowsInput] = useState('')
  const [splitInput, setSplitInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setMaxRowsInput('')
      setSplitInput('')
    }
  }, [open])

  if (!open) return null

  async function handleExport() {
    if (maxRowsInput.trim() && parseOptionalPositiveInt(maxRowsInput) === undefined) {
      window.alert('Max rows must be a positive whole number, or leave the field empty.')
      return
    }
    if (splitInput.trim() && parseOptionalPositiveInt(splitInput) === undefined) {
      window.alert('Rows per file must be a positive whole number, or leave empty for one file.')
      return
    }

    const maxRows = parseOptionalPositiveInt(maxRowsInput)
    const rowsPerFile = parseOptionalPositiveInt(splitInput)

    setBusy(true)
    try {
      await onRunExport({
        maxRows,
        rowsPerFile,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-5 shadow-lg"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="export-modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm opacity-80 mt-2">
          Exports respect your current <strong>search</strong> and list <strong>filters</strong>. Format:{' '}
          <strong>CSV</strong> (UTF-8, Excel-friendly).
        </p>
        <p className="text-sm mt-2">
          <span className="opacity-70">Rows available:</span>{' '}
          <span className="font-semibold tabular-nums">{rowCount}</span>
        </p>

        <div className="mt-4 grid gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Max rows to export</span>
            <span className="text-xs opacity-70">
              Leave empty to export all rows in the list above. Otherwise export only the first N (after
              filters).
            </span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder={`e.g. 100 (max ${rowCount})`}
              value={maxRowsInput}
              onChange={(e) => setMaxRowsInput(e.target.value)}
              className="rounded-md border px-3 py-2 outline-none text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Split into multiple files</span>
            <span className="text-xs opacity-70">
              Rows <strong>per CSV file</strong>. Example: <strong>6</strong> with 20 rows → 4 files (6
              + 6 + 6 + 2). Leave empty for a single file.
            </span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 6"
              value={splitInput}
              onChange={(e) => setSplitInput(e.target.value)}
              className="rounded-md border px-3 py-2 outline-none text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={outlineBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={busy || rowCount === 0}
            onClick={() => void handleExport()}
          >
            {busy ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}

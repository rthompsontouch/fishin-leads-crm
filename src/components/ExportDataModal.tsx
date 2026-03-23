import { useEffect, useMemo, useState } from 'react'
import type {
  CsvDelimiterPreset,
  ExportFormat,
  ExportSortOrder,
  FlexibleExportInput,
} from '../lib/csvExport'

const outlineBtn =
  'rounded-md px-3 py-1.5 text-sm font-semibold border cursor-pointer transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)]'
const primaryBtn =
  'rounded-md px-3 py-1.5 text-sm font-semibold text-white cursor-pointer transition-colors duration-150 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed'

export type ExportFieldOption = { id: string; label: string }

type ExportDataModalProps = {
  open: boolean
  onClose: () => void
  title: string
  /** Rows that match current search / filters (export uses this set). */
  rowCount: number
  /** Available columns/fields for this entity */
  exportFields: ExportFieldOption[]
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
  exportFields,
  onRunExport,
}: ExportDataModalProps) {
  const [maxRowsInput, setMaxRowsInput] = useState('')
  const [splitInput, setSplitInput] = useState('')
  const [filenamePrefix, setFilenamePrefix] = useState('')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [csvDelimiter, setCsvDelimiter] = useState<CsvDelimiterPreset>('comma')
  const [sortOrder, setSortOrder] = useState<ExportSortOrder>('list')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)

  const allIds = useMemo(() => exportFields.map((f) => f.id), [exportFields])

  useEffect(() => {
    if (open) {
      setMaxRowsInput('')
      setSplitInput('')
      setFilenamePrefix('')
      setFormat('csv')
      setCsvDelimiter('comma')
      setSortOrder('list')
      setSelectedIds(new Set(allIds))
    }
  }, [open, allIds])

  if (!open) return null

  function toggleField(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllColumns() {
    setSelectedIds(new Set(allIds))
  }

  function clearAllColumns() {
    setSelectedIds(new Set())
  }

  async function handleExport() {
    if (maxRowsInput.trim() && parseOptionalPositiveInt(maxRowsInput) === undefined) {
      window.alert('Max rows must be a positive whole number, or leave the field empty.')
      return
    }
    if (splitInput.trim() && parseOptionalPositiveInt(splitInput) === undefined) {
      window.alert('Rows per file must be a positive whole number, or leave empty for one file.')
      return
    }

    const effectiveColumns =
      selectedIds.size === 0 || selectedIds.size === allIds.length ? undefined : [...selectedIds]

    if (effectiveColumns?.length === 0) {
      window.alert('Select at least one column, or use “Select all”.')
      return
    }

    const maxRows = parseOptionalPositiveInt(maxRowsInput)
    const rowsPerFile = parseOptionalPositiveInt(splitInput)

    const options: FlexibleExportInput = {
      maxRows,
      rowsPerFile,
      format,
      sortOrder,
      filenamePrefix: filenamePrefix.trim() || undefined,
    }

    if (format === 'csv') {
      options.csvDelimiter = csvDelimiter
    }

    if (effectiveColumns) {
      options.columns = effectiveColumns
    }

    setBusy(true)
    try {
      await onRunExport(options)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const exportLabel = format === 'json' ? 'Download JSON' : 'Download CSV'

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
        className="w-full max-w-lg max-h-[min(90vh,720px)] rounded-xl border shadow-lg flex flex-col"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-background)',
          color: 'var(--color-foreground)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h2 id="export-modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm opacity-80 mt-2">
            Uses your current <strong>search</strong> and <strong>filters</strong>. UTF-8; CSV includes a
            BOM for Excel.
          </p>
          <p className="text-sm mt-2">
            <span className="opacity-70">Rows available:</span>{' '}
            <span className="font-semibold tabular-nums">{rowCount}</span>
          </p>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-5 crm-scrollbar">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">File format</span>
              <select
                className="rounded-md border px-3 py-2 outline-none text-sm"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
              >
                <option value="csv">CSV (spreadsheet)</option>
                <option value="json">JSON (arrays of objects)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Row order</span>
              <select
                className="rounded-md border px-3 py-2 outline-none text-sm"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as ExportSortOrder)}
              >
                <option value="list">Same as list (default)</option>
                <option value="newest">Newest first (by created)</option>
                <option value="oldest">Oldest first (by created)</option>
              </select>
            </label>
          </div>

          {format === 'csv' ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">CSV delimiter</span>
              <select
                className="rounded-md border px-3 py-2 outline-none text-sm max-w-xs"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                value={csvDelimiter}
                onChange={(e) => setCsvDelimiter(e.target.value as CsvDelimiterPreset)}
              >
                <option value="comma">Comma (,)</option>
                <option value="semicolon">Semicolon (;) — common in EU Excel</option>
                <option value="tab">Tab (TSV)</option>
              </select>
            </label>
          ) : null}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium">Columns to include</span>
              <div className="flex gap-2">
                <button type="button" className={outlineBtn} onClick={selectAllColumns}>
                  Select all
                </button>
                <button type="button" className={outlineBtn} onClick={clearAllColumns}>
                  Clear
                </button>
              </div>
            </div>
            <p className="text-xs opacity-70 mb-2">
              All selected = full export. Pick a subset for lighter files or JSON APIs.
            </p>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3 max-h-40 overflow-y-auto text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
            >
              {exportFields.map((f) => (
                <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(f.id)}
                    onChange={() => toggleField(f.id)}
                    className="rounded border"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <span className="font-mono text-xs truncate" title={f.label}>
                    {f.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Filename prefix (optional)</span>
            <span className="text-xs opacity-70">
              Prepended to download names, e.g. <code className="text-xs">q1-2025</code> →{' '}
              <code className="text-xs">q1-2025-leads-export.csv</code>
            </span>
            <input
              type="text"
              placeholder="e.g. backup-march"
              value={filenamePrefix}
              onChange={(e) => setFilenamePrefix(e.target.value)}
              className="rounded-md border px-3 py-2 outline-none text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Max rows</span>
              <span className="text-xs opacity-70">Empty = all rows in the filtered list.</span>
              <input
                type="number"
                min={1}
                step={1}
                placeholder={`max ${rowCount}`}
                value={maxRowsInput}
                onChange={(e) => setMaxRowsInput(e.target.value)}
                className="rounded-md border px-3 py-2 outline-none text-sm"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Rows per file</span>
              <span className="text-xs opacity-70">Split into multiple files. Empty = one file.</span>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 500"
                value={splitInput}
                onChange={(e) => setSplitInput(e.target.value)}
                className="rounded-md border px-3 py-2 outline-none text-sm"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
              />
            </label>
          </div>
        </div>

        <div
          className="p-5 border-t shrink-0 flex flex-wrap justify-end gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button type="button" className={outlineBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={busy || rowCount === 0}
            onClick={() => void handleExport()}
          >
            {busy ? 'Exporting…' : exportLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

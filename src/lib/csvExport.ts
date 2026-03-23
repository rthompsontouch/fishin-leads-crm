/** Escape a single CSV cell (RFC-style, Excel-friendly). */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  return rowsToDelimited(headers, rows, ',')
}

export function rowsToDelimited(
  headers: string[],
  rows: string[][],
  delimiter: string,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(delimiter),
    ...rows.map((r) => r.map(escapeCsvCell).join(delimiter)),
  ]
  // BOM helps Excel on Windows recognize UTF-8
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[^\w.\-]+/g, '_')
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[^\w.\-]+/g, '_')
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadJson(filename: string, data: unknown) {
  const text = `${JSON.stringify(data, null, 2)}\n`
  downloadTextFile(filename, text, 'application/json;charset=utf-8')
}

export function chunkSlices<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    out.push(arr.slice(i, i + chunkSize))
  }
  return out.length ? out : [[]]
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export type ExportFormat = 'csv' | 'json'

export type CsvDelimiterPreset = 'comma' | 'semicolon' | 'tab'

export type ExportSortOrder = 'list' | 'newest' | 'oldest'

export type FlexibleExportInput = {
  maxRows?: number
  rowsPerFile?: number
  format?: ExportFormat
  csvDelimiter?: CsvDelimiterPreset
  /** Column/field ids; empty or undefined = all columns */
  columns?: string[]
  sortOrder?: ExportSortOrder
  /** Sanitized and prepended to filenames, e.g. "acme-q1" → acme-q1-leads-export.csv */
  filenamePrefix?: string
}

export function delimiterFromPreset(preset: CsvDelimiterPreset | undefined): string {
  if (preset === 'semicolon') return ';'
  if (preset === 'tab') return '\t'
  return ','
}

export function sanitizeExportFilenamePart(raw: string): string {
  const t = raw.trim().replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 80)
  return t.replace(/^_|_$/g, '') || 'export'
}

/** Apply max row limit to a copy of the dataset. */
export function applyMaxRows<T>(rows: T[], maxRows?: number): T[] {
  if (maxRows == null || !Number.isFinite(maxRows) || maxRows < 1) return [...rows]
  return rows.slice(0, Math.min(Math.floor(maxRows), rows.length))
}

export function sortByCreatedAt<T extends { created_at: string }>(
  rows: T[],
  order: ExportSortOrder | undefined,
): T[] {
  const copy = [...rows]
  if (order === 'newest') {
    copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (order === 'oldest') {
    copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }
  return copy
}

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
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
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

export type FlexibleExportInput = {
  maxRows?: number
  rowsPerFile?: number
}

/** Apply max row limit to a copy of the dataset. */
export function applyMaxRows<T>(rows: T[], maxRows?: number): T[] {
  if (maxRows == null || !Number.isFinite(maxRows) || maxRows < 1) return [...rows]
  return rows.slice(0, Math.min(Math.floor(maxRows), rows.length))
}

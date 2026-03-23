import type { CustomerRow } from '../features/customers/api/customersApi'
import {
  applyMaxRows,
  chunkSlices,
  delimiterFromPreset,
  downloadCsv,
  downloadJson,
  rowsToDelimited,
  sanitizeExportFilenamePart,
  sleep,
  sortByCreatedAt,
  type FlexibleExportInput,
} from './csvExport'

export const CUSTOMER_EXPORT_FIELDS: { id: string; label: string }[] = [
  { id: 'id', label: 'id' },
  { id: 'name', label: 'name' },
  { id: 'primary_first_name', label: 'primary_first_name' },
  { id: 'primary_last_name', label: 'primary_last_name' },
  { id: 'primary_title', label: 'primary_title' },
  { id: 'primary_email', label: 'primary_email' },
  { id: 'primary_phone', label: 'primary_phone' },
  { id: 'industry', label: 'industry' },
  { id: 'company_size', label: 'company_size' },
  { id: 'website', label: 'website' },
  { id: 'status', label: 'status' },
  { id: 'created_at', label: 'created_at' },
]

function customerFieldValue(c: CustomerRow, id: string): string {
  const v = (c as Record<string, unknown>)[id]
  if (v == null) return ''
  return String(v)
}

function resolveCustomerColumns(selectedIds: string[] | undefined): { id: string; label: string }[] {
  const all = CUSTOMER_EXPORT_FIELDS
  if (!selectedIds?.length) return [...all]
  const set = new Set(selectedIds)
  return all.filter((f) => set.has(f.id))
}

export type CustomerExportFile =
  | { kind: 'csv'; filename: string; content: string }
  | { kind: 'json'; filename: string; data: unknown }

export function buildCustomerExportFiles(
  customers: CustomerRow[],
  options: FlexibleExportInput,
): CustomerExportFile[] {
  const sorted = sortByCreatedAt(customers, options.sortOrder)
  let data = applyMaxRows(sorted, options.maxRows)
  if (data.length === 0) return []

  const cols = resolveCustomerColumns(options.columns)
  const headers = cols.map((c) => c.label)
  const format = options.format ?? 'csv'
  const perFile = options.rowsPerFile
  const chunkSize =
    perFile != null && Number.isFinite(perFile) && perFile >= 1 ? Math.floor(perFile) : data.length
  const needsSplit = chunkSize < data.length
  const prefix = options.filenamePrefix?.trim()
    ? `${sanitizeExportFilenamePart(options.filenamePrefix!)}-`
    : ''

  const rowMatrix = (chunk: CustomerRow[]) =>
    chunk.map((row) => cols.map((c) => customerFieldValue(row, c.id)))

  const jsonRecords = (chunk: CustomerRow[]) =>
    chunk.map((row) => {
      const o: Record<string, string> = {}
      for (const c of cols) {
        o[c.label] = customerFieldValue(row, c.id)
      }
      return o
    })

  if (format === 'json') {
    const chunks = needsSplit ? chunkSlices(data, chunkSize) : [data]
    const total = chunks.length
    return chunks.map((chunk, i) => ({
      kind: 'json' as const,
      filename:
        total > 1
          ? `${prefix}customers-export-part-${i + 1}-of-${total}.json`
          : `${prefix}customers-export.json`,
      data: jsonRecords(chunk),
    }))
  }

  const delim = delimiterFromPreset(options.csvDelimiter)
  const chunks = needsSplit ? chunkSlices(data, chunkSize) : [data]
  const total = chunks.length
  return chunks.map((chunk, i) => ({
    kind: 'csv' as const,
    filename:
      total > 1
        ? `${prefix}customers-export-part-${i + 1}-of-${total}.csv`
        : `${prefix}customers-export.csv`,
    content: rowsToDelimited(headers, rowMatrix(chunk), delim),
  }))
}

export async function runCustomerExport(customers: CustomerRow[], options: FlexibleExportInput) {
  const files = buildCustomerExportFiles(customers, options)
  if (files.length === 0) {
    window.alert('Nothing to export for the current filters.')
    return
  }
  for (let i = 0; i < files.length; i++) {
    if (i > 0) await sleep(450)
    const f = files[i]
    if (f.kind === 'csv') downloadCsv(f.filename, f.content)
    else downloadJson(f.filename, f.data)
  }
}

/** @deprecated use runCustomerExport */
export async function runCustomerCsvDownload(customers: CustomerRow[], options: FlexibleExportInput) {
  return runCustomerExport(customers, options)
}

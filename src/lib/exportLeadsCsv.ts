import type { LeadRow } from '../features/leads/api/leadsApi'
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

/** All exportable field ids (order = default column order). */
export const LEAD_EXPORT_FIELDS: { id: string; label: string }[] = [
  { id: 'id', label: 'id' },
  { id: 'first_name', label: 'first_name' },
  { id: 'last_name', label: 'last_name' },
  { id: 'company', label: 'company' },
  { id: 'email', label: 'email' },
  { id: 'phone', label: 'phone' },
  { id: 'source', label: 'source' },
  { id: 'details', label: 'details' },
  { id: 'status', label: 'status' },
  { id: 'industry', label: 'industry' },
  { id: 'company_size', label: 'company_size' },
  { id: 'website', label: 'website' },
  { id: 'last_contacted_at', label: 'last_contacted_at' },
  { id: 'created_at', label: 'created_at' },
]

function leadFieldValue(lead: LeadRow, id: string): string {
  const v = (lead as Record<string, unknown>)[id]
  if (v == null) return ''
  return String(v)
}

function resolveLeadColumns(selectedIds: string[] | undefined): { id: string; label: string }[] {
  const all = LEAD_EXPORT_FIELDS
  if (!selectedIds?.length) return [...all]
  const set = new Set(selectedIds)
  return all.filter((f) => set.has(f.id))
}

export type LeadExportFile =
  | { kind: 'csv'; filename: string; content: string }
  | { kind: 'json'; filename: string; data: unknown }

export function buildLeadExportFiles(leads: LeadRow[], options: FlexibleExportInput): LeadExportFile[] {
  const sorted = sortByCreatedAt(leads, options.sortOrder)
  let data = applyMaxRows(sorted, options.maxRows)
  if (data.length === 0) return []

  const cols = resolveLeadColumns(options.columns)
  const headers = cols.map((c) => c.label)
  const format = options.format ?? 'csv'
  const perFile = options.rowsPerFile
  const chunkSize =
    perFile != null && Number.isFinite(perFile) && perFile >= 1 ? Math.floor(perFile) : data.length
  const needsSplit = chunkSize < data.length
  const prefix = options.filenamePrefix?.trim()
    ? `${sanitizeExportFilenamePart(options.filenamePrefix!)}-`
    : ''

  const rowMatrix = (chunk: LeadRow[]) =>
    chunk.map((lead) => cols.map((c) => leadFieldValue(lead, c.id)))

  const jsonRecords = (chunk: LeadRow[]) =>
    chunk.map((lead) => {
      const o: Record<string, string> = {}
      for (const c of cols) {
        o[c.label] = leadFieldValue(lead, c.id)
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
          ? `${prefix}leads-export-part-${i + 1}-of-${total}.json`
          : `${prefix}leads-export.json`,
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
        ? `${prefix}leads-export-part-${i + 1}-of-${total}.csv`
        : `${prefix}leads-export.csv`,
    content: rowsToDelimited(headers, rowMatrix(chunk), delim),
  }))
}

export async function runLeadExport(leads: LeadRow[], options: FlexibleExportInput) {
  const files = buildLeadExportFiles(leads, options)
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

/** @deprecated use runLeadExport */
export async function runLeadCsvDownload(leads: LeadRow[], options: FlexibleExportInput) {
  return runLeadExport(leads, options)
}

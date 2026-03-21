import type { LeadRow } from '../features/leads/api/leadsApi'
import {
  applyMaxRows,
  chunkSlices,
  downloadCsv,
  rowsToCsv,
  sleep,
  type FlexibleExportInput,
} from './csvExport'

const HEADERS = [
  'id',
  'first_name',
  'last_name',
  'company',
  'email',
  'phone',
  'source',
  'status',
  'industry',
  'company_size',
  'website',
  'last_contacted_at',
  'created_at',
] as const

function leadRowToCells(lead: LeadRow): string[] {
  return [
    lead.id,
    lead.first_name ?? '',
    lead.last_name ?? '',
    lead.company ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    lead.source ?? '',
    lead.status ?? '',
    lead.industry ?? '',
    lead.company_size ?? '',
    lead.website ?? '',
    lead.last_contacted_at ?? '',
    lead.created_at ?? '',
  ]
}

/**
 * Builds one or more CSV strings from leads (after optional limit & split).
 */
export function buildLeadCsvExports(
  leads: LeadRow[],
  options: FlexibleExportInput,
): { filename: string; csv: string }[] {
  let data = applyMaxRows(leads, options.maxRows)
  if (data.length === 0) {
    return []
  }

  const rows = data.map(leadRowToCells)
  const perFile = options.rowsPerFile

  if (
    perFile == null ||
    !Number.isFinite(perFile) ||
    perFile < 1 ||
    data.length <= perFile
  ) {
    return [{ filename: 'leads-export.csv', csv: rowsToCsv([...HEADERS], rows) }]
  }

  const chunks = chunkSlices(rows, Math.floor(perFile))
  const total = chunks.length
  return chunks.map((chunk, i) => ({
    filename: `leads-export-part-${i + 1}-of-${total}.csv`,
    csv: rowsToCsv([...HEADERS], chunk),
  }))
}

export async function runLeadCsvDownload(leads: LeadRow[], options: FlexibleExportInput) {
  const files = buildLeadCsvExports(leads, options)
  if (files.length === 0) {
    window.alert('Nothing to export for the current filters.')
    return
  }
  for (let i = 0; i < files.length; i++) {
    if (i > 0) await sleep(450)
    downloadCsv(files[i].filename, files[i].csv)
  }
}

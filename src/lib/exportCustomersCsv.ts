import type { CustomerRow } from '../features/customers/api/customersApi'
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
  'name',
  'primary_first_name',
  'primary_last_name',
  'primary_title',
  'primary_email',
  'primary_phone',
  'industry',
  'company_size',
  'website',
  'status',
  'created_at',
] as const

function customerRowToCells(c: CustomerRow): string[] {
  return [
    c.id,
    c.name ?? '',
    c.primary_first_name ?? '',
    c.primary_last_name ?? '',
    c.primary_title ?? '',
    c.primary_email ?? '',
    c.primary_phone ?? '',
    c.industry ?? '',
    c.company_size ?? '',
    c.website ?? '',
    c.status ?? '',
    c.created_at ?? '',
  ]
}

export function buildCustomerCsvExports(
  customers: CustomerRow[],
  options: FlexibleExportInput,
): { filename: string; csv: string }[] {
  let data = applyMaxRows(customers, options.maxRows)
  if (data.length === 0) {
    return []
  }

  const rows = data.map(customerRowToCells)
  const perFile = options.rowsPerFile

  if (
    perFile == null ||
    !Number.isFinite(perFile) ||
    perFile < 1 ||
    data.length <= perFile
  ) {
    return [{ filename: 'customers-export.csv', csv: rowsToCsv([...HEADERS], rows) }]
  }

  const chunks = chunkSlices(rows, Math.floor(perFile))
  const total = chunks.length
  return chunks.map((chunk, i) => ({
    filename: `customers-export-part-${i + 1}-of-${total}.csv`,
    csv: rowsToCsv([...HEADERS], chunk),
  }))
}

export async function runCustomerCsvDownload(
  customers: CustomerRow[],
  options: FlexibleExportInput,
) {
  const files = buildCustomerCsvExports(customers, options)
  if (files.length === 0) {
    window.alert('Nothing to export for the current filters.')
    return
  }
  for (let i = 0; i < files.length; i++) {
    if (i > 0) await sleep(450)
    downloadCsv(files[i].filename, files[i].csv)
  }
}

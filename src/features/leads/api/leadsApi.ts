import { Constants, type Database } from '../../../lib/supabase.types'
import {
  isMissingNotesTitleColumnError,
  normalizeLeadNoteRow,
} from '../../../lib/noteDbCompat'
import { addCustomerNote, getCustomerById } from '../../customers/api/customersApi'
import { supabase } from '../../../lib/supabaseClient'

export type LeadRow = Database['public']['Tables']['leads']['Row']
export type LeadNoteRow =
  Database['public']['Tables']['lead_notes']['Row']

export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
export type CustomerRow =
  Database['public']['Tables']['customers']['Row']

export type ListLeadsParams = {
  uncontactedOnly?: boolean
}

/** Columns returned by list views / exports (dashboard metrics use `listLeads`). */
const LEAD_LIST_SELECT = [
  'id',
  'first_name',
  'last_name',
  'company',
  'industry',
  'company_size',
  'website',
  'email',
  'phone',
  'source',
  'details',
  'status',
  'last_contacted_at',
  'created_at',
  'converted_at',
  'converted_customer_id',
].join(',')

/** Strip characters that break PostgREST `.or()` / ILIKE filters. */
function normalizeLeadSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[,()]/g, ' ')
    .replace(/[%_\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const LEAD_STATUS_SEARCH_VALUES = Constants.public.Enums.lead_status as readonly string[]

/** Postgres enums cannot use ILIKE; match the search term against known labels and use `status.in`. */
function leadStatusesMatchingSearch(term: string): string[] {
  const t = term.trim().toLowerCase()
  if (!t) return []
  return LEAD_STATUS_SEARCH_VALUES.filter((s) => {
    const sl = s.toLowerCase()
    if (t.length === 1) return sl.startsWith(t)
    return sl.includes(t)
  })
}

type LeadListQueryOps<Q> = Q & {
  is: (column: string, value: null) => Q
  or: (filters: string) => Q
}

function applyLeadListFilters<Q>(
  query: Q,
  opts: { uncontactedOnly: boolean; search?: string },
): Q {
  let q = query
  if (opts.uncontactedOnly) {
    q = (q as LeadListQueryOps<Q>).is('last_contacted_at', null)
  }
  const term = normalizeLeadSearchTerm(opts.search ?? '')
  if (term) {
    const p = `%${term}%`
    const parts = [
      `first_name.ilike.${p}`,
      `last_name.ilike.${p}`,
      `company.ilike.${p}`,
      `email.ilike.${p}`,
      `phone.ilike.${p}`,
      `source.ilike.${p}`,
    ]
    const statusHits = leadStatusesMatchingSearch(term)
    if (statusHits.length > 0) {
      parts.push(`status.in.(${statusHits.join(',')})`)
    }
    q = (q as LeadListQueryOps<Q>).or(parts.join(','))
  }
  return q
}

export type ListLeadsPagedParams = {
  /** 1-based page index */
  page: number
  pageSize: number
  uncontactedOnly?: boolean
  /** Server-side search across name, company, email, phone, status, source */
  search?: string
}

export type ListLeadsPagedResult = {
  rows: LeadRow[]
  total: number
}

export async function listLeadsPaged(
  params: ListLeadsPagedParams,
): Promise<ListLeadsPagedResult> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const page = Math.max(1, Math.floor(params.page))
  const pageSize = Math.max(1, Math.min(100, Math.floor(params.pageSize)))
  const uncontactedOnly = params.uncontactedOnly ?? false
  const search = params.search
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const filterOpts = { uncontactedOnly, search }

  let countQuery = supabase.from('leads').select('id', { count: 'exact', head: true })
  countQuery = applyLeadListFilters(countQuery, filterOpts)

  const { count, error: countError } = await countQuery
  if (countError) throw countError
  const total = count ?? 0

  let dataQuery = supabase
    .from('leads')
    .select(LEAD_LIST_SELECT)
    .order('created_at', { ascending: false })
  dataQuery = applyLeadListFilters(dataQuery, filterOpts)
  dataQuery = dataQuery.range(from, to)

  const { data, error: dataError } = await dataQuery.returns<LeadRow[]>()

  if (dataError) throw dataError

  return { rows: data ?? [], total }
}

/** All leads matching filters + search (for CSV export). */
export async function listLeadsForExport(params?: {
  uncontactedOnly?: boolean
  search?: string
}): Promise<LeadRow[]> {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const uncontactedOnly = params?.uncontactedOnly ?? false
  const search = params?.search

  let query = supabase
    .from('leads')
    .select(LEAD_LIST_SELECT)
    .order('created_at', { ascending: false })

  query = applyLeadListFilters(query, { uncontactedOnly, search })

  const { data, error } = await query.returns<LeadRow[]>()

  if (error) throw error
  return data ?? []
}

async function getUserId() {
  if (!supabase) throw new Error('Supabase client not configured')
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  const userId = session?.user.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

export async function listLeads(params?: ListLeadsParams) {
  if (!supabase) {
    throw new Error('Supabase client not configured')
  }

  const uncontactedOnly = params?.uncontactedOnly ?? false

  let query = supabase
    .from('leads')
    .select(LEAD_LIST_SELECT)
    .order('created_at', { ascending: false })

  if (uncontactedOnly) {
    query = query.is('last_contacted_at', null)
  }

  const { data, error } = await query.returns<LeadRow[]>()

  if (error) throw error

  return data
}

export async function getLeadById(leadId: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('leads')
    .select(
      [
        'id',
        'first_name',
        'last_name',
        'company',
        'industry',
        'company_size',
        'website',
        'email',
        'phone',
        'source',
        'details',
        'status',
        'last_contacted_at',
        'created_at',
      ].join(','),
    )
    .eq('id', leadId)
    .single<LeadRow>()

  if (error) {
    // When record doesn't exist, Supabase often returns PGRST116 for .single()
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

export async function listLeadNotes(leadId: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
    .returns<LeadNoteRow[]>()

  if (error) throw error
  return (data ?? []).map((r) => normalizeLeadNoteRow(r))
}

export async function getLeadNoteById(leadId: string, noteId: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('id', noteId)
    .eq('lead_id', leadId)
    .maybeSingle<LeadNoteRow>()

  if (error) throw error
  return data ? normalizeLeadNoteRow(data) : data
}

export type CreateLeadInput = {
  first_name?: string
  last_name?: string
  company?: string | null
  industry?: string | null
  company_size?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  details?: string | null
  status: LeadInsert['status']
}

export async function createLead(input: CreateLeadInput) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const {
    data,
    error,
  } = await supabase
    .from('leads')
    .insert({
      owner_id: ownerId,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      company: input.company ?? null,
      industry: input.industry ?? null,
      company_size: input.company_size ?? null,
      website: input.website ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      details: input.details ?? null,
      status: input.status,
    })
    .select(
      [
        'id',
        'first_name',
        'last_name',
        'company',
        'industry',
        'company_size',
        'website',
        'email',
        'phone',
        'source',
        'details',
        'status',
        'last_contacted_at',
        'created_at',
      ].join(','),
    )
    .single<LeadRow>()

  if (error) throw error
  return data
}

export type UpdateLeadInput = {
  id: string
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  industry?: string | null
  company_size?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  details?: string | null
  status?: LeadUpdate['status']
}

export async function updateLead(input: UpdateLeadInput) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  // `details` may not exist in the generated `LeadUpdate` type yet (types file can lag
  // behind migrations). Use `any` so the API remains compatible during iteration.
  const patch: any = {
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    company: input.company ?? null,
    industry: input.industry ?? null,
    company_size: input.company_size ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? null,
    details: input.details ?? null,
  }
  if (input.status) patch.status = input.status

  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', input.id)
    .eq('owner_id', ownerId)
    .select(
      [
        'id',
        'first_name',
        'last_name',
        'company',
        'industry',
        'company_size',
        'website',
        'email',
        'phone',
        'source',
        'details',
        'status',
        'last_contacted_at',
        'created_at',
      ].join(','),
    )
    .single<LeadRow>()

  if (error) throw error
  return data
}

export async function deleteLead(leadId: string) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('owner_id', ownerId)

  if (error) throw error
}

export type CreateLeadNoteInput = {
  type: LeadNoteRow['type']
  title: string
  body: string
  occurred_at?: string | Date
}

export async function deleteLeadNote(noteId: string) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', noteId)
    .eq('owner_id', ownerId)

  if (error) throw error
}

export async function addLeadNote(leadId: string, input: CreateLeadNoteInput) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const occurred =
    input.occurred_at instanceof Date
      ? input.occurred_at.toISOString()
      : input.occurred_at
        ? new Date(input.occurred_at).toISOString()
        : new Date().toISOString()

  const baseRow = {
    owner_id: ownerId,
    lead_id: leadId,
    type: input.type,
    body: input.body,
    occurred_at: occurred,
  }

  let res = await supabase
    .from('lead_notes')
    .insert({ ...baseRow, title: input.title.trim() })
    .select('*')
    .single<LeadNoteRow>()

  if (res.error && isMissingNotesTitleColumnError(res.error)) {
    res = await supabase.from('lead_notes').insert(baseRow).select('*').single<LeadNoteRow>()
  }

  if (res.error) throw res.error
  return normalizeLeadNoteRow(res.data)
}

export async function convertLeadToCustomer(leadId: string) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const emptyToNull = (v: string | null | undefined) => {
    if (v === null || v === undefined) return null
    const t = v.trim()
    return t ? t : null
  }

  const mapLeadStatusToCustomerStatus = (
    leadStatus: LeadRow['status'],
  ): CustomerRow['status'] => {
    // MVP mapping: closed deals become Active/Churned, everything else is a Prospect.
    const s = leadStatus as unknown as string
    if (s === 'Won') return 'Active'
    if (s === 'Lost') return 'Churned'
    return 'Prospect'
  }

  // Load lead so we can populate the customer fields.
  const lead = await getLeadById(leadId)
  if (!lead) throw new Error('Lead not found')

  const companyName = emptyToNull(lead.company)
  const primaryFirst = emptyToNull(lead.first_name)
  const primaryLast = emptyToNull(lead.last_name)

  const customerName =
    companyName ||
    [primaryFirst, primaryLast].filter(Boolean).join(' ') ||
    'Converted Customer'

  // 1) Create customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      owner_id: ownerId,
      name: customerName,
      email: emptyToNull(lead.email),
      phone: emptyToNull(lead.phone),

      primary_first_name: primaryFirst,
      primary_last_name: primaryLast,
      primary_email: emptyToNull(lead.email),
      primary_phone: emptyToNull(lead.phone),

      industry: emptyToNull(lead.industry),
      company_size: emptyToNull(lead.company_size),
      website: emptyToNull(lead.website),

      status: mapLeadStatusToCustomerStatus(lead.status),
      last_contacted_at: lead.last_contacted_at,
    })
    .select(
      [
        'id',
        'name',
        'primary_email',
        'primary_phone',
        'industry',
        'company_size',
        'website',
        'status',
        'last_contacted_at',
        'created_at',
      ].join(','),
    )
    .single<CustomerRow>()

  if (customerError) throw customerError

  // 2) Copy lead notes and add conversion note.
  const leadNotes = await listLeadNotes(leadId)
  const sorted = [...(leadNotes ?? [])].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )
  const toCopy = sorted

  for (const n of toCopy) {
    await addCustomerNote(customer.id, {
      type: n.type,
      title: (n.title ?? '').trim() || 'From lead',
      body: n.body,
      occurred_at: n.occurred_at,
    })
  }

  await addCustomerNote(customer.id, {
    type: 'note',
    title: 'Lead converted',
    body: `Converted from lead: ${customerName}`,
    occurred_at: new Date(),
  })

  // 3) Link lead -> customer (keep the lead record so quote/job history stays connected).
  await supabase
    .from('leads')
    .update({
      converted_customer_id: customer.id,
      converted_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('owner_id', ownerId)

  return customer
}

export async function mergeLeadIntoCustomer(leadId: string, customerId: string) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const emptyToNull = (v: string | null | undefined) => {
    if (v === null || v === undefined) return null
    const t = v.trim()
    return t ? t : null
  }

  const mapLeadStatusToCustomerStatus = (
    leadStatus: LeadRow['status'],
  ): CustomerRow['status'] => {
    // MVP mapping: deals become Active/Churned, everything else is a Prospect.
    const s = leadStatus as unknown as string
    if (s === 'Won') return 'Active'
    if (s === 'Lost') return 'Churned'
    return 'Prospect'
  }

  const lead = await getLeadById(leadId)
  if (!lead) throw new Error('Lead not found')

  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .select(
      [
        'id',
        'owner_id',
        'name',
        'primary_first_name',
        'primary_last_name',
        'primary_email',
        'primary_phone',
        'industry',
        'company_size',
        'website',
        'status',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .eq('id', customerId)
    .single<CustomerRow>()

  if (customerErr) throw customerErr
  if (!customer) throw new Error('Customer not found')

  const companyName = emptyToNull(lead.company)
  const primaryFirst = emptyToNull(lead.first_name)
  const primaryLast = emptyToNull(lead.last_name)
  const recipientName =
    companyName ||
    [primaryFirst, primaryLast].filter(Boolean).join(' ') ||
    'Converted Customer'

  const leadEmail = emptyToNull(lead.email)
  const leadPhone = emptyToNull(lead.phone)

  // Update customer fields only if empty or generic.
  const shouldUpdateName = customer.name.trim() === '' || customer.name === 'Converted Customer'

  const patch: Partial<CustomerRow> = {
    name: shouldUpdateName ? recipientName : undefined,

    primary_first_name: customer.primary_first_name ?? primaryFirst ?? undefined,
    primary_last_name: customer.primary_last_name ?? primaryLast ?? undefined,
    primary_email: customer.primary_email ?? leadEmail ?? undefined,
    primary_phone: customer.primary_phone ?? leadPhone ?? undefined,

    email: customer.primary_email ?? leadEmail ?? undefined,
    phone: customer.primary_phone ?? leadPhone ?? undefined,

    industry: customer.industry ?? emptyToNull(lead.industry) ?? undefined,
    company_size: customer.company_size ?? emptyToNull(lead.company_size) ?? undefined,
    website: customer.website ?? emptyToNull(lead.website) ?? undefined,

    status: mapLeadStatusToCustomerStatus(lead.status),
  }

  const { error: updateErr } = await supabase
    .from('customers')
    .update(patch as any)
    .eq('id', customerId)
    .eq('owner_id', ownerId)

  if (updateErr) throw updateErr

  // Copy lead notes and then add conversion note.
  const leadNotes = await listLeadNotes(leadId)
  const sorted = [...(leadNotes ?? [])].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )

  const conversionNote = {
    type: 'note' as const,
    title: 'Lead merged into customer',
    body: `Merged from lead: ${recipientName}`,
    occurred_at: new Date(),
  }

  const toCopy = sorted

  for (const n of toCopy) {
    await addCustomerNote(customerId, {
      type: n.type,
      title: (n.title ?? '').trim() || 'From lead',
      body: n.body,
      occurred_at: n.occurred_at,
    })
  }

  await addCustomerNote(customerId, conversionNote)

  // Link lead -> customer (keep the lead record).
  await supabase
    .from('leads')
    .update({
      converted_customer_id: customerId,
      converted_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('owner_id', ownerId)

  // Return fresh customer row (simplifies UI).
  const updated = await getCustomerById(customerId)
  if (!updated) throw new Error('Customer not found after merge')
  return updated
}


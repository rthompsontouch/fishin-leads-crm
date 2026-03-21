import type { Database } from '../../../lib/supabase.types'
import {
  isMissingNotesTitleColumnError,
  MAX_NOTES_PER_RECORD,
  normalizeLeadNoteRow,
  noteLimitReachedMessage,
} from '../../../lib/noteDbCompat'
import { addCustomerNote } from '../../customers/api/customersApi'
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
        'status',
        'last_contacted_at',
        'created_at',
      ].join(','),
    )
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
  status?: LeadUpdate['status']
}

export async function updateLead(input: UpdateLeadInput) {
  const ownerId = await getUserId()
  if (!supabase) throw new Error('Supabase client not configured')

  const patch: Partial<LeadUpdate> = {
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    company: input.company ?? null,
    industry: input.industry ?? null,
    company_size: input.company_size ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? null,
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

  const { count: existing, error: countError } = await supabase
    .from('lead_notes')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)

  if (countError) throw countError
  if ((existing ?? 0) >= MAX_NOTES_PER_RECORD) {
    throw new Error(noteLimitReachedMessage())
  }

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
    if (leadStatus === 'ClosedWon') return 'Active'
    if (leadStatus === 'ClosedLost') return 'Churned'
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

  // 2) Copy up to (MAX-1) most recent lead notes, then add conversion note (max 5 total).
  const leadNotes = await listLeadNotes(leadId)
  const sorted = [...(leadNotes ?? [])].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )
  const toCopy = sorted.slice(0, MAX_NOTES_PER_RECORD - 1)

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

  // 3) Remove lead (cascades lead_notes); record now lives only as customer.
  await deleteLead(leadId)

  return customer
}


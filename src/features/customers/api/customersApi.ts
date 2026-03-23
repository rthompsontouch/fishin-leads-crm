import type { Database } from '../../../lib/supabase.types'
import {
  isMissingNotesTitleColumnError,
  MAX_NOTES_PER_RECORD,
  normalizeCustomerNoteRow,
  noteLimitReachedMessage,
} from '../../../lib/noteDbCompat'
import { supabase } from '../../../lib/supabaseClient'
import {
  buildServiceImageStoragePath,
  SERVICE_IMAGE_SIGNED_URL_TTL_SEC,
  SERVICE_IMAGES_BUCKET,
} from '../../../lib/serviceImageStorage'

export type CustomerRow = Database['public']['Tables']['customers']['Row']
export type CustomerNoteRow = Database['public']['Tables']['customer_notes']['Row']
export type ServiceEntryRow = Database['public']['Tables']['service_entries']['Row']
export type ServiceAttachmentRow = Database['public']['Tables']['service_attachments']['Row']

export type CreateCustomerInput = {
  name: string

  // Primary contact
  primary_first_name?: string | null
  primary_last_name?: string | null
  primary_title?: string | null
  primary_email?: string | null
  primary_phone?: string | null

  // Account-level company info
  industry?: string | null
  company_size?: string | null
  website?: string | null

  // Billing address
  billing_street?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_postal_code?: string | null
  billing_country?: string | null

  status?: CustomerRow['status']
}

export type UpdateCustomerInput = {
  id: string
  name: string
  primary_first_name?: string | null
  primary_last_name?: string | null
  primary_title?: string | null
  primary_email?: string | null
  primary_phone?: string | null

  industry?: string | null
  company_size?: string | null
  website?: string | null

  billing_street?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_postal_code?: string | null
  billing_country?: string | null

  status?: CustomerRow['status']
}

export type CreateCustomerNoteInput = {
  type: CustomerNoteRow['type']
  title: string
  body: string
  occurred_at?: string | Date
}

export type UpdateCustomerNoteInput = {
  id: string
  type?: CustomerNoteRow['type']
  title?: string
  body?: string
  occurred_at?: string | Date
}

export type CreateServiceEntryInput = {
  service_date: Date | string
  description: string
  price_amount?: number | null
  price_currency?: string
  job_id?: string | null
}

type ServiceEntryWithAttachments = ServiceEntryRow & {
  attachments: Array<ServiceAttachmentRow & { signed_url: string | null }>
}

async function getUserId() {
  const {
    data: { session },
    error,
  } = await supabase!.auth.getSession()
  if (error) throw error
  const userId = session?.user.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

export async function listCustomers() {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('customers')
    .select(
      [
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
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .returns<CustomerRow[]>()

  if (error) throw error
  return data
}

export async function findCustomersByEmailOrPhone(input: { email?: string | null; phone?: string | null }) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const email = input.email?.trim() ? input.email.trim().toLowerCase() : null
  const phoneRaw = input.phone?.trim() ? input.phone.trim() : null
  const phoneNoSpaces = phoneRaw ? phoneRaw.replace(/\s+/g, '') : null

  let query = supabase
    .from('customers')
    .select(
      [
        'id',
        'name',
        'primary_email',
        'primary_phone',
        'email',
        'phone',
        'industry',
        'company_size',
        'website',
        'status',
        'created_at',
      ].join(','),
    )
    .eq('owner_id', ownerId)

  const ors: string[] = []
  if (email) {
    // Note: ilike allows case-insensitive matching. Passing the exact email string works for exact match.
    ors.push(`primary_email.ilike.${email}`)
    ors.push(`email.ilike.${email}`)
  }
  if (phoneRaw) {
    ors.push(`primary_phone.eq.${phoneRaw}`)
    ors.push(`phone.eq.${phoneRaw}`)
  }
  if (phoneNoSpaces && phoneNoSpaces !== phoneRaw) {
    ors.push(`primary_phone.eq.${phoneNoSpaces}`)
    ors.push(`phone.eq.${phoneNoSpaces}`)
  }

  if (ors.length > 0) {
    query = query.or(ors.join(','))
  } else {
    // If neither email nor phone provided, return empty.
    return [] as CustomerRow[]
  }

  const { data, error } = await query.order('created_at', { ascending: false }).returns<CustomerRow[]>()
  if (error) throw error
  return data ?? []
}

export async function getCustomerById(customerId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const { data, error } = await supabase
    .from('customers')
    .select(
      [
        'id',
        'owner_id',
        'name',
        'primary_first_name',
        'primary_last_name',
        'primary_title',
        'primary_email',
        'primary_phone',
        'industry',
        'company_size',
        'website',
        'billing_street',
        'billing_city',
        'billing_state',
        'billing_postal_code',
        'billing_country',
        'status',
        'last_contacted_at',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .eq('id', customerId)
    .single<CustomerRow>()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function createCustomer(input: CreateCustomerInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('customers')
    .insert({
      owner_id: ownerId,
      name: input.name,
      // legacy columns (still exist): keep them synced to primary_* for MVP
      email: input.primary_email ?? null,
      phone: input.primary_phone ?? null,

      primary_first_name: input.primary_first_name ?? null,
      primary_last_name: input.primary_last_name ?? null,
      primary_title: input.primary_title ?? null,
      primary_email: input.primary_email ?? null,
      primary_phone: input.primary_phone ?? null,

      industry: input.industry ?? null,
      company_size: input.company_size ?? null,
      website: input.website ?? null,

      billing_street: input.billing_street ?? null,
      billing_city: input.billing_city ?? null,
      billing_state: input.billing_state ?? null,
      billing_postal_code: input.billing_postal_code ?? null,
      billing_country: input.billing_country ?? null,

      status: input.status ?? 'Active',
    })
    .select(
      [
        'id',
        'name',
        'primary_email',
        'primary_phone',
        'industry',
        'website',
        'status',
        'created_at',
      ].join(','),
    )
    .single<CustomerRow>()

  if (error) throw error
  return data
}

export async function updateCustomer(input: UpdateCustomerInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('customers')
    .update({
      name: input.name,
      email: input.primary_email ?? null,
      phone: input.primary_phone ?? null,

      primary_first_name: input.primary_first_name ?? null,
      primary_last_name: input.primary_last_name ?? null,
      primary_title: input.primary_title ?? null,
      primary_email: input.primary_email ?? null,
      primary_phone: input.primary_phone ?? null,

      industry: input.industry ?? null,
      company_size: input.company_size ?? null,
      website: input.website ?? null,

      billing_street: input.billing_street ?? null,
      billing_city: input.billing_city ?? null,
      billing_state: input.billing_state ?? null,
      billing_postal_code: input.billing_postal_code ?? null,
      billing_country: input.billing_country ?? null,

      status: input.status ?? undefined,
    })
    .eq('id', input.id)
    .eq('owner_id', ownerId)
    .select(
      [
        'id',
        'name',
        'primary_email',
        'primary_phone',
        'industry',
        'website',
        'status',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .single<CustomerRow>()

  if (error) throw error
  return data
}

export async function deleteCustomer(customerId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('owner_id', ownerId)

  if (error) throw error
}

export async function listCustomerNotes(customerId: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('customer_notes')
    .select('*')
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false })
    .returns<CustomerNoteRow[]>()

  if (error) throw error
  return (data ?? []).map((r) => normalizeCustomerNoteRow(r))
}

export async function getCustomerNoteById(customerId: string, noteId: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('customer_notes')
    .select('*')
    .eq('id', noteId)
    .eq('customer_id', customerId)
    .maybeSingle<CustomerNoteRow>()

  if (error) throw error
  return data ? normalizeCustomerNoteRow(data) : data
}

export async function addCustomerNote(customerId: string, input: CreateCustomerNoteInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { count: existing, error: countError } = await supabase
    .from('customer_notes')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)

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
    customer_id: customerId,
    type: input.type,
    body: input.body,
    occurred_at: occurred,
  }

  let res = await supabase
    .from('customer_notes')
    .insert({ ...baseRow, title: input.title.trim() })
    .select('*')
    .single<CustomerNoteRow>()

  if (res.error && isMissingNotesTitleColumnError(res.error)) {
    res = await supabase
      .from('customer_notes')
      .insert(baseRow)
      .select('*')
      .single<CustomerNoteRow>()
  }

  if (res.error) throw res.error
  return normalizeCustomerNoteRow(res.data)
}

export async function listServiceEntries(customerId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const client = supabase

  const { data: services, error } = await supabase
    .from('service_entries')
    .select(['id', 'customer_id', 'service_date', 'description', 'price_amount', 'price_currency', 'created_at', 'updated_at'].join(','))
    .eq('customer_id', customerId)
    .order('service_date', { ascending: false })
    .returns<ServiceEntryRow[]>()

  if (error) throw error

  const serviceIds = (services ?? []).map((s) => s.id)
  if (serviceIds.length === 0) return [] as ServiceEntryWithAttachments[]

  const { data: attachments, error: attachmentsError } = await supabase
    .from('service_attachments')
    .select(['id', 'service_id', 'file_name', 'content_type', 'storage_bucket', 'storage_path', 'created_at'].join(','))
    .in('service_id', serviceIds)
    .returns<ServiceAttachmentRow[]>()

  if (attachmentsError) throw attachmentsError

  const map = new Map<string, ServiceAttachmentRow[]>()
  ;(attachments ?? []).forEach((a) => {
    const list = map.get(a.service_id) ?? []
    list.push(a)
    map.set(a.service_id, list)
  })

  const attachmentsWithSignedUrls = await Promise.all(
    (attachments ?? []).map(async (a) => {
      try {
        const signed = await client.storage
          .from(a.storage_bucket)
          .createSignedUrl(a.storage_path, SERVICE_IMAGE_SIGNED_URL_TTL_SEC)

        if (signed.error) {
          console.warn('Signed URL failed', a.storage_path, signed.error.message)
          return { ...a, signed_url: null }
        }
        return { ...a, signed_url: signed.data?.signedUrl ?? null }
      } catch {
        return { ...a, signed_url: null }
      }
    }),
  )

  const mapSigned = new Map<string, Array<ServiceEntryWithAttachments['attachments'][number]>>()
  ;(attachmentsWithSignedUrls ?? []).forEach((a) => {
    const list = mapSigned.get(a.service_id) ?? []
    list.push(a)
    mapSigned.set(a.service_id, list)
  })

  return (services ?? []).map((s) => ({
    ...(s as any),
    attachments: mapSigned.get(s.id) ?? [],
  })) as ServiceEntryWithAttachments[]
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_')
}

export async function addServiceEntryWithImages(
  customerId: string,
  input: CreateServiceEntryInput,
  files: File[],
) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const serviceDate =
    input.service_date instanceof Date
      ? input.service_date
      : new Date(input.service_date)

  const { data: service, error: serviceError } = await supabase
    .from('service_entries')
    .insert({
      owner_id: ownerId,
      customer_id: customerId,
      job_id: input.job_id ?? null,
      service_date: serviceDate.toISOString().slice(0, 10), // YYYY-MM-DD
      description: input.description,
      price_amount: input.price_amount ?? null,
      price_currency: input.price_currency ?? 'USD',
    })
    .select(['id', 'customer_id', 'service_date', 'description', 'price_amount', 'price_currency', 'created_at', 'updated_at'].join(','))
    .single<ServiceEntryRow>()

  if (serviceError) throw serviceError

  // Upload images to Supabase Storage, then write attachment rows.
  const bucket = SERVICE_IMAGES_BUCKET

  const uploadedAttachments: ServiceAttachmentRow[] = []

  for (const file of files) {
    const safeName = sanitizeFileName(file.name)
    const storagePath = buildServiceImageStoragePath(ownerId, service.id, safeName)

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: attachment, error: attachmentError } = await supabase
      .from('service_attachments')
      .insert({
        owner_id: ownerId,
        service_id: service.id,
        file_name: safeName,
        content_type: file.type || null,
        storage_bucket: bucket,
        storage_path: storagePath,
      })
      .select(['id', 'service_id', 'file_name', 'content_type', 'storage_bucket', 'storage_path', 'created_at'].join(','))
      .single<ServiceAttachmentRow>()

    if (attachmentError) throw attachmentError
    uploadedAttachments.push(attachment)
  }

  return { service, attachments: uploadedAttachments }
}

export async function updateCustomerNote(input: UpdateCustomerNoteInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const occurred =
    input.occurred_at instanceof Date
      ? input.occurred_at.toISOString()
      : input.occurred_at
        ? new Date(input.occurred_at).toISOString()
        : undefined

  const patch: Partial<CustomerNoteRow> = {}
  if (input.type) patch.type = input.type
  if (typeof input.title === 'string') patch.title = input.title.trim()
  if (typeof input.body === 'string') patch.body = input.body
  if (occurred) patch.occurred_at = occurred

  let res = await supabase
    .from('customer_notes')
    .update(patch)
    .eq('id', input.id)
    .eq('owner_id', ownerId)
    .select('*')
    .single<CustomerNoteRow>()

  if (res.error && isMissingNotesTitleColumnError(res.error) && 'title' in patch) {
    const { title: _t, ...rest } = patch
    if (Object.keys(rest).length === 0) {
      throw new Error(
        'Updating note titles needs the `title` column in the database. Run the SQL from the notes setup hint (or `supabase db push`).',
      )
    }
    res = await supabase
      .from('customer_notes')
      .update(rest)
      .eq('id', input.id)
      .eq('owner_id', ownerId)
      .select('*')
      .single<CustomerNoteRow>()
  }

  if (res.error) throw res.error
  return normalizeCustomerNoteRow(res.data)
}

export async function deleteCustomerNote(noteId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { error } = await supabase
    .from('customer_notes')
    .delete()
    .eq('id', noteId)
    .eq('owner_id', ownerId)

  if (error) throw error
}

export async function deleteServiceEntryWithImages(serviceId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const client = supabase
  const ownerId = await getUserId()

  const { data: attachments, error: attachmentsError } = await supabase
    .from('service_attachments')
    .select(['storage_bucket', 'storage_path'].join(','))
    .eq('service_id', serviceId)
    .eq('owner_id', ownerId)
    .returns<Pick<ServiceAttachmentRow, 'storage_bucket' | 'storage_path'>[]>()

  if (attachmentsError) throw attachmentsError

  // Remove Storage objects first (paths from DB), then delete the service row (CASCADE drops attachment rows).
  const byBucket = new Map<string, string[]>()
  for (const a of attachments ?? []) {
    const list = byBucket.get(a.storage_bucket) ?? []
    list.push(a.storage_path)
    byBucket.set(a.storage_bucket, list)
  }

  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, paths]) => {
      if (paths.length === 0) return
      const { error } = await client.storage.from(bucket).remove(paths)
      if (error) {
        console.warn('Storage remove (service entry delete):', bucket, error.message)
      }
    }),
  )

  const { error: serviceError } = await supabase
    .from('service_entries')
    .delete()
    .eq('id', serviceId)
    .eq('owner_id', ownerId)

  if (serviceError) throw serviceError
}


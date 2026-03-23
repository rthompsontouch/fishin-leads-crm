import type { Database } from '../../../lib/supabase.types'
import { supabase } from '../../../lib/supabaseClient'
import {
  QUOTE_IMAGES_BUCKET,
  QUOTE_IMAGE_SIGNED_URL_TTL_SEC,
  buildQuoteImageStoragePath,
} from '../../../lib/quoteImageStorage'

export type LeadRow = Database['public']['Tables']['leads']['Row']

type QuoteStatus = 'Draft' | 'Sent' | 'Won' | 'Lost'

export type QuoteRow = {
  id: string
  owner_id: string
  lead_id: string | null
  customer_id: string | null
  recipient_name: string | null
  recipient_email: string | null
  recipient_phone: string | null
  status: QuoteStatus
  price_amount: number
  price_currency: string
  description: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
  won_at: string | null
  lost_at: string | null
}

export type QuoteLineItemRow = {
  id: string
  owner_id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  created_at: string
  updated_at: string
}

export type QuoteAttachmentRow = {
  id: string
  owner_id: string
  quote_id: string
  file_name: string
  content_type: string | null
  storage_bucket: string
  storage_path: string
  created_at: string
}

export type QuoteAttachmentWithSignedUrl = QuoteAttachmentRow & {
  signed_url: string | null
}

export type QuoteWithDetails = QuoteRow & {
  line_items: QuoteLineItemRow[]
  attachments: QuoteAttachmentWithSignedUrl[]
}

export type QuoteLineItemInput = {
  description: string
  quantity: number
  unit_price: number
}

export type CreateQuoteInput = {
  price_amount: number
  price_currency?: string
  description?: string | null
  line_items?: QuoteLineItemInput[]
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

function emptyToNull(v: string | null | undefined) {
  if (v === null || v === undefined) return null
  const t = v.trim()
  return t ? t : null
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_')
}

export async function listQuotesByLead(leadId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(
      [
        'id',
        'owner_id',
        'lead_id',
        'customer_id',
        'recipient_name',
        'recipient_email',
        'recipient_phone',
        'status',
        'price_amount',
        'price_currency',
        'description',
        'created_at',
        'updated_at',
        'sent_at',
        'won_at',
        'lost_at',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw error
  const list = (quotes ?? []) as unknown as QuoteRow[]
  if (list.length === 0) return [] as QuoteWithDetails[]

  // Fetch line items + attachments with follow-up queries (v1 simplicity).
  const quoteIds = list.map((q) => q.id)

  const { data: lineItems, error: lineErr } = await supabase
    .from('quote_line_items')
    .select(['id', 'owner_id', 'quote_id', 'description', 'quantity', 'unit_price', 'created_at', 'updated_at'].join(','))
    .eq('owner_id', ownerId)
    .in('quote_id', quoteIds)
    .order('created_at', { ascending: true })

  if (lineErr) throw lineErr

  const { data: attachments, error: attErr } = await supabase
    .from('quote_attachments')
    .select(
      [
        'id',
        'owner_id',
        'quote_id',
        'file_name',
        'content_type',
        'storage_bucket',
        'storage_path',
        'created_at',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .in('quote_id', quoteIds)
    .order('created_at', { ascending: true })

  if (attErr) throw attErr

  const lineByQuoteId = new Map<string, QuoteLineItemRow[]>()
  ;(lineItems ?? []).forEach((li) => {
    const key = (li as any).quote_id as string
    const list = lineByQuoteId.get(key) ?? []
    list.push(li as unknown as QuoteLineItemRow)
    lineByQuoteId.set(key, list)
  })

  const attachmentsByQuoteId = new Map<string, QuoteAttachmentWithSignedUrl[]>()
  const client = supabase
  const attachmentsList = (attachments ?? []) as unknown as QuoteAttachmentRow[]
  for (const a of attachmentsList) {
    let signed_url: string | null = null
    try {
      const signed = await client.storage
        .from(a.storage_bucket)
        .createSignedUrl(a.storage_path, QUOTE_IMAGE_SIGNED_URL_TTL_SEC)
      signed_url = signed.data?.signedUrl ?? null
    } catch {
      signed_url = null
    }
    const withSigned: QuoteAttachmentWithSignedUrl = { ...a, signed_url }
    const qid = a.quote_id
    const list = attachmentsByQuoteId.get(qid) ?? []
    list.push(withSigned)
    attachmentsByQuoteId.set(qid, list)
  }

  return list.map((q) => ({
    ...q,
    line_items: lineByQuoteId.get(q.id) ?? [],
    attachments: attachmentsByQuoteId.get(q.id) ?? [],
  }))
}

export async function getQuoteById(quoteId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      [
        'id',
        'owner_id',
        'lead_id',
        'customer_id',
        'recipient_name',
        'recipient_email',
        'recipient_phone',
        'status',
        'price_amount',
        'price_currency',
        'description',
        'created_at',
        'updated_at',
        'sent_at',
        'won_at',
        'lost_at',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .eq('id', quoteId)
    .single<QuoteRow>()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  if (!quote) return null

  const client = supabase

  const [lineRes, attRes] = await Promise.all([
    supabase
      .from('quote_line_items')
      .select(['id', 'owner_id', 'quote_id', 'description', 'quantity', 'unit_price', 'created_at', 'updated_at'].join(','))
      .eq('owner_id', ownerId)
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true }),
    supabase
      .from('quote_attachments')
      .select(['id', 'owner_id', 'quote_id', 'file_name', 'content_type', 'storage_bucket', 'storage_path', 'created_at'].join(','))
      .eq('owner_id', ownerId)
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true }),
  ])

  if (lineRes.error) throw lineRes.error
  if (attRes.error) throw attRes.error

  const attachmentsList = (attRes.data ?? []) as unknown as QuoteAttachmentRow[]
  const attachmentsWithSignedUrls: QuoteAttachmentWithSignedUrl[] = await Promise.all(
    attachmentsList.map(async (a) => {
      try {
        const signed = await client.storage
          .from(a.storage_bucket)
          .createSignedUrl(a.storage_path, QUOTE_IMAGE_SIGNED_URL_TTL_SEC)
        return { ...a, signed_url: signed.data?.signedUrl ?? null }
      } catch {
        return { ...a, signed_url: null }
      }
    }),
  )

  return {
    ...(quote as QuoteRow),
    line_items: (lineRes.data ?? []) as unknown as QuoteLineItemRow[],
    attachments: attachmentsWithSignedUrls,
  } satisfies QuoteWithDetails
}

export async function createQuoteFromLead(leadId: string, input: CreateQuoteInput, files: File[]) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select(['id', 'first_name', 'last_name', 'company', 'email', 'phone', 'details'].join(','))
    .eq('owner_id', ownerId)
    .eq('id', leadId)
    .single<LeadRow>()

  if (leadErr) throw leadErr
  if (!lead) throw new Error('Lead not found')

  const recipientName =
    emptyToNull(lead.company) ||
    [emptyToNull(lead.first_name), emptyToNull(lead.last_name)].filter(Boolean).join(' ') ||
    'Quote Recipient'

  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .insert({
      owner_id: ownerId,
      lead_id: leadId,
      recipient_name: recipientName,
      recipient_email: emptyToNull(lead.email),
      recipient_phone: emptyToNull(lead.phone),
      status: 'Draft',
      price_amount: input.price_amount,
      price_currency: input.price_currency ?? 'USD',
      description: input.description ?? emptyToNull((lead as any).details) ?? null,
    })
    .select(
      [
        'id',
        'owner_id',
        'lead_id',
        'customer_id',
        'recipient_name',
        'recipient_email',
        'recipient_phone',
        'status',
        'price_amount',
        'price_currency',
        'description',
        'created_at',
        'updated_at',
        'sent_at',
        'won_at',
        'lost_at',
      ].join(','),
    )
    .single<QuoteRow>()

  if (quoteErr) throw quoteErr
  if (!quote) throw new Error('Quote creation failed')

  // Insert normalized line items.
  if (input.line_items && input.line_items.length > 0) {
    const items = input.line_items
      .filter((li) => li.description.trim())
      .map((li) => ({
        owner_id: ownerId,
        quote_id: quote.id,
        description: li.description.trim(),
        quantity: Math.max(1, Math.floor(Number(li.quantity) || 1)),
        unit_price: Number(li.unit_price) || 0,
      }))

    const { error: itemsErr } = await supabase.from('quote_line_items').insert(items)
    if (itemsErr) throw itemsErr
  }

  // Upload + create attachments rows.
  for (const file of files) {
    const safeName = sanitizeFileName(file.name)
    const storagePath = buildQuoteImageStoragePath(ownerId, quote.id, safeName)

    const { error: uploadErr } = await supabase.storage
      .from(QUOTE_IMAGES_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      })

    if (uploadErr) throw uploadErr

    const { error: attErr } = await supabase.from('quote_attachments').insert({
      owner_id: ownerId,
      quote_id: quote.id,
      file_name: safeName,
      content_type: file.type || null,
      storage_bucket: QUOTE_IMAGES_BUCKET,
      storage_path: storagePath,
    })

    if (attErr) throw attErr
  }

  return quote
}

export async function sendQuote(quoteId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('quotes')
    .update({
      status: 'Sent',
      sent_at: now,
    })
    .eq('owner_id', ownerId)
    .eq('id', quoteId)
    .select(['id', 'status', 'sent_at'].join(','))
    .single<Pick<QuoteRow, 'id' | 'status' | 'sent_at'>>()

  if (error) throw error
  return data
}

export async function markQuoteWon(quoteId: string, customerId?: string | null) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: 'Won',
    won_at: now,
  }
  if (customerId !== undefined) patch.customer_id = customerId

  const { data, error } = await supabase
    .from('quotes')
    .update(patch)
    .eq('owner_id', ownerId)
    .eq('id', quoteId)
    .select(['id', 'status', 'won_at', 'customer_id'].join(','))
    .single()

  if (error) throw error
  return data
}


import { supabase } from '../../../lib/supabaseClient'
import { addServiceEntryWithImages } from '../../customers/api/customersApi'

export type QuoteRowForJob = {
  id: string
  price_amount: number
  price_currency: string
  description: string | null
}

export type JobRecurrenceUnit = 'weekly' | 'biweekly' | 'monthly'
export type JobStatus = 'Scheduled' | 'Completed'

export type JobRow = {
  id: string
  owner_id: string
  lead_id: string | null
  quote_id: string
  customer_id: string
  status: JobStatus
  scheduled_date: string // YYYY-MM-DD
  notes: string | null
  is_recurring: boolean
  recurrence_unit: JobRecurrenceUnit | null
  reminder_at: string | null
  reminder_sent_at: string | null
  last_completed_at: string | null
  created_at: string
  updated_at: string
}

export type JobWithQuoteSummary = JobRow & {
  quote: {
    id: string
    price_amount: number
    price_currency: string
    description: string | null
  } | null
  customer: { id: string; name: string } | null
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

function parseLocalDate(dateStr: string) {
  // dateStr is expected to be YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map((n) => Number(n))
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function addRecurrenceToDate(date: Date, unit: JobRecurrenceUnit) {
  const d = new Date(date.getTime())
  if (unit === 'weekly') d.setDate(d.getDate() + 7)
  if (unit === 'biweekly') d.setDate(d.getDate() + 14)
  if (unit === 'monthly') d.setMonth(d.getMonth() + 1)
  return d
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

export async function getJobById(jobId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('jobs')
    .select(
      [
        'id',
        'owner_id',
        'lead_id',
        'quote_id',
        'customer_id',
        'status',
        'scheduled_date',
        'notes',
        'is_recurring',
        'recurrence_unit',
        'reminder_at',
        'reminder_sent_at',
        'last_completed_at',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .eq('id', jobId)
    .single<JobRow>()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function listUpcomingJobs() {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('jobs')
    .select(
      [
        'id',
        'customer_id',
        'quote_id',
        'scheduled_date',
        'status',
        'reminder_at',
        'reminder_sent_at',
        'is_recurring',
        'recurrence_unit',
        'last_completed_at',
        'notes',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .eq('status', 'Scheduled')
    .order('scheduled_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as Array<
    Pick<
      JobRow,
      | 'id'
      | 'customer_id'
      | 'quote_id'
      | 'scheduled_date'
      | 'status'
      | 'reminder_at'
      | 'reminder_sent_at'
      | 'is_recurring'
      | 'recurrence_unit'
      | 'last_completed_at'
      | 'notes'
    >
  >
}

export async function listJobsByCustomer(customerId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('jobs')
    .select(
      [
        'id',
        'owner_id',
        'lead_id',
        'quote_id',
        'customer_id',
        'status',
        'scheduled_date',
        'notes',
        'is_recurring',
        'recurrence_unit',
        'reminder_at',
        'reminder_sent_at',
        'last_completed_at',
        'created_at',
        'updated_at',
        'quote:quotes(id,price_amount,price_currency,description)',
        'customer:customers(id,name)',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .eq('customer_id', customerId)
    .eq('status', 'Scheduled')
    .order('scheduled_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as JobWithQuoteSummary[]
}

export async function listJobs() {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('jobs')
    .select(
      [
        'id',
        'owner_id',
        'lead_id',
        'quote_id',
        'customer_id',
        'status',
        'scheduled_date',
        'notes',
        'is_recurring',
        'recurrence_unit',
        'reminder_at',
        'reminder_sent_at',
        'last_completed_at',
        'created_at',
        'updated_at',
        'quote:quotes(id,price_amount,price_currency,description)',
        'customer:customers(id,name)',
      ].join(','),
    )
    .eq('owner_id', ownerId)
    .order('scheduled_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as JobWithQuoteSummary[]
}

export type CreateJobInput = {
  lead_id?: string | null
  quote_id: string
  customer_id: string
  scheduled_date: Date | string
  notes?: string | null
  is_recurring?: boolean
  recurrence_unit?: JobRecurrenceUnit | null
  reminder_at?: Date | string | null
}

export type CreateManualJobInput = {
  customer_id: string
  scheduled_date: Date | string
  notes?: string | null
  is_recurring?: boolean
  recurrence_unit?: JobRecurrenceUnit | null
  reminder_at?: Date | string | null
  quote_price_amount?: number
  quote_price_currency?: string
  quote_description?: string | null
}

export async function createJobFromQuote(input: CreateJobInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const scheduled =
    input.scheduled_date instanceof Date
      ? input.scheduled_date.toISOString().slice(0, 10)
      : new Date(input.scheduled_date).toISOString().slice(0, 10)

  const reminderAt =
    input.reminder_at === undefined || input.reminder_at === null
      ? null
      : (input.reminder_at instanceof Date
          ? input.reminder_at.toISOString()
          : new Date(input.reminder_at).toISOString())

  const isRecurring = input.is_recurring ?? false
  const recurrenceUnit = isRecurring ? input.recurrence_unit ?? 'weekly' : null

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      owner_id: ownerId,
      lead_id: input.lead_id ?? null,
      quote_id: input.quote_id,
      customer_id: input.customer_id,
      scheduled_date: scheduled,
      notes: input.notes ?? null,
      is_recurring: isRecurring,
      recurrence_unit: recurrenceUnit,
      reminder_at: reminderAt,
      reminder_sent_at: null,
      status: 'Scheduled',
    })
    .select(['id', 'status'].join(','))
    .single()

  if (error) throw error
  return data as unknown as { id: string; status: JobStatus }
}

export async function createManualJobForCustomer(input: CreateManualJobInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .select('id,name,primary_email,primary_phone')
    .eq('owner_id', ownerId)
    .eq('id', input.customer_id)
    .single()
  if (customerErr) throw customerErr

  const nowIso = new Date().toISOString()
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .insert({
      owner_id: ownerId,
      lead_id: null,
      customer_id: input.customer_id,
      recipient_name: (customer as any).name ?? 'Customer',
      recipient_email: (customer as any).primary_email ?? null,
      recipient_phone: (customer as any).primary_phone ?? null,
      status: 'Won',
      won_at: nowIso,
      price_amount: Number(input.quote_price_amount ?? 0),
      price_currency: input.quote_price_currency ?? 'USD',
      description: input.quote_description?.trim() ? input.quote_description.trim() : null,
    })
    .select('id')
    .single()
  if (quoteErr) throw quoteErr

  return createJobFromQuote({
    customer_id: input.customer_id,
    lead_id: null,
    quote_id: (quote as any).id as string,
    scheduled_date: input.scheduled_date,
    notes: input.notes ?? null,
    is_recurring: input.is_recurring ?? false,
    recurrence_unit: input.is_recurring ? input.recurrence_unit ?? 'weekly' : null,
    reminder_at: input.reminder_at ?? null,
  })
}

export type CompleteJobInput = {
  files: File[]
  completed_notes?: string | null
}

export async function completeJob(jobId: string, input: CompleteJobInput) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const job = await getJobById(jobId)
  if (!job) throw new Error('Job not found')
  if (job.owner_id !== ownerId) throw new Error('Unauthorized')

  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .select(['id', 'price_amount', 'price_currency', 'description'].join(','))
    .eq('id', job.quote_id)
    .single<QuoteRowForJob>()

  if (quoteErr) throw quoteErr
  if (!quote) throw new Error('Quote not found')

  const completedAt = new Date()
  const serviceDate = completedAt.toISOString().slice(0, 10)

  const baseDescription = job.notes?.trim()
    ? job.notes.trim()
    : quote.description?.trim()
      ? quote.description.trim()
      : 'Job completed'

  const completedNotes = input.completed_notes?.trim() || null
  const description = completedNotes
    ? `${baseDescription}\n\nCompleted notes: ${completedNotes}`
    : baseDescription

  // Create service history entry + attachments.
  await addServiceEntryWithImages(job.customer_id, {
    service_date: serviceDate,
    description,
    price_amount: quote.price_amount,
    price_currency: quote.price_currency,
    // NOTE: this expects customersApi to accept `job_id` (we will add it).
    job_id: job.id,
  } as any, input.files)

  // Advance job schedule.
  const nextNowIso = completedAt.toISOString()
  if (job.is_recurring && job.recurrence_unit) {
    const scheduledDateObj = parseLocalDate(job.scheduled_date)
    const nextDate = addRecurrenceToDate(scheduledDateObj, job.recurrence_unit)
    const nextScheduled = isoDateOnly(nextDate)

    let nextReminderAt: string | null = null
    if (job.reminder_at) {
      const r = new Date(job.reminder_at)
      const nextReminderDate = addRecurrenceToDate(r, job.recurrence_unit)
      nextReminderAt = nextReminderDate.toISOString()
    }

    const { error: upErr } = await supabase
      .from('jobs')
      .update({
        scheduled_date: nextScheduled,
        status: 'Scheduled',
        reminder_at: nextReminderAt,
        reminder_sent_at: null,
        last_completed_at: nextNowIso,
        updated_at: nextNowIso,
      })
      .eq('id', jobId)
      .eq('owner_id', ownerId)

    if (upErr) throw upErr
  } else {
    const { error: upErr } = await supabase
      .from('jobs')
      .update({
        status: 'Completed',
        last_completed_at: nextNowIso,
        updated_at: nextNowIso,
      })
      .eq('id', jobId)
      .eq('owner_id', ownerId)

    if (upErr) throw upErr
  }

  return { ok: true }
}


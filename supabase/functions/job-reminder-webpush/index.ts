import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'

type JsonObject = Record<string, unknown>

type JobRow = {
  id: string
  owner_id: string
  customer_id: string
  scheduled_date: string
  reminder_at: string | null
  notes: string | null
}

type DispatchBody = {
  limit?: number
  dry_run?: boolean
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const allowOrigin = origin && origin.length > 0 ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeadersFor(req),
      ...headers,
    },
  })
}

function getReminderBody(job: JobRow, customerName: string | null) {
  const dateText = new Date(`${job.scheduled_date}T09:00:00`).toLocaleDateString()
  const top = customerName?.trim() || 'Upcoming service'
  return `${top} • ${dateText}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) })
  }
  if (req.method !== 'POST') {
    return json(req, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
  }

  try {
    const body = (await req.json().catch(() => ({}))) as DispatchBody
    const limit = Math.max(1, Math.min(Number(body.limit ?? 200), 500))
    const dryRun = Boolean(body.dry_run ?? false)

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const vapidKeysJson = Deno.env.get('VAPID_KEYS_JSON')
    const contactEmail = Deno.env.get('VAPID_CONTACT_EMAIL') ?? 'admin@example.com'
    if (!serviceRoleKey || !supabaseUrl) {
      return json(req, { ok: false, error: { code: 'MISSING_SUPABASE_CONFIG' } }, 500)
    }
    if (!vapidKeysJson) {
      return json(req, { ok: false, error: { code: 'MISSING_VAPID_KEYS_JSON' } }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const nowIso = new Date().toISOString()
    const { data: dueJobs, error: jobsErr } = await supabase
      .from('jobs')
      .select(['id', 'owner_id', 'customer_id', 'scheduled_date', 'reminder_at', 'notes'].join(','))
      .eq('status', 'Scheduled')
      .is('reminder_sent_at', null)
      .not('reminder_at', 'is', null)
      .lte('reminder_at', nowIso)
      .order('reminder_at', { ascending: true })
      .limit(limit)

    if (jobsErr) throw jobsErr
    const jobs = (dueJobs ?? []) as unknown as JobRow[]
    if (jobs.length === 0) {
      return json(req, { ok: true, processed_jobs: 0, sent: 0, failed: 0, marked_sent: 0, dry_run: dryRun })
    }

    const customerIds = [...new Set(jobs.map((j) => j.customer_id))]
    const ownerIds = [...new Set(jobs.map((j) => j.owner_id))]

    const [{ data: customers, error: customersErr }, { data: subs, error: subsErr }] = await Promise.all([
      supabase
        .from('customers')
        .select('id,name')
        .in('id', customerIds),
      supabase
        .from('notification_subscriptions')
        .select('id,owner_id,endpoint,p256dh,auth')
        .in('owner_id', ownerIds),
    ])
    if (customersErr) throw customersErr
    if (subsErr) throw subsErr

    const customerNameById = new Map<string, string | null>()
    for (const c of customers ?? []) {
      customerNameById.set((c as any).id, (c as any).name ?? null)
    }

    const subsByOwner = new Map<string, Array<{ id: string; endpoint: string; p256dh: string; auth: string }>>()
    for (const s of subs ?? []) {
      const ownerId = (s as any).owner_id as string
      const list = subsByOwner.get(ownerId) ?? []
      list.push({
        id: (s as any).id as string,
        endpoint: (s as any).endpoint as string,
        p256dh: (s as any).p256dh as string,
        auth: (s as any).auth as string,
      })
      subsByOwner.set(ownerId, list)
    }

    const exportedKeys = JSON.parse(vapidKeysJson) as webpush.ExportedVapidKeys
    const vapidKeys = await webpush.importVapidKeys(exportedKeys)
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: `mailto:${contactEmail}`,
      vapidKeys,
    })

    let sent = 0
    let failed = 0
    const markSentIds: string[] = []

    for (const job of jobs) {
      const ownerSubs = subsByOwner.get(job.owner_id) ?? []
      if (ownerSubs.length === 0) {
        markSentIds.push(job.id)
        continue
      }

      const payloadText = JSON.stringify({
        title: 'Upcoming service reminder',
        body: getReminderBody(job, customerNameById.get(job.customer_id) ?? null),
        url: `/jobs/${job.id}`,
      })

      let jobSent = 0
      for (const s of ownerSubs) {
        const subscriber = appServer.subscribe({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        })
        try {
          if (!dryRun) {
            await subscriber.pushTextMessage(payloadText, {
              urgency: webpush.Urgency.High,
              ttl: 60 * 30,
            })
          }
          sent += 1
          jobSent += 1
        } catch (e) {
          failed += 1
          const err = e as any
          const maybeGone =
            typeof err?.isGone === 'function' ? err.isGone() : false
          if (maybeGone && !dryRun) {
            await supabase.from('notification_subscriptions').delete().eq('id', s.id)
          }
        }
      }

      if (jobSent > 0 || dryRun) {
        markSentIds.push(job.id)
      }
    }

    if (!dryRun && markSentIds.length > 0) {
      const { error: markErr } = await supabase
        .from('jobs')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', markSentIds)
      if (markErr) throw markErr
    }

    return json(req, {
      ok: true,
      processed_jobs: jobs.length,
      sent,
      failed,
      marked_sent: markSentIds.length,
      dry_run: dryRun,
    })
  } catch (e) {
    console.error('[job-reminder-webpush] error', e)
    return json(
      req,
      { ok: false, error: { code: 'INTERNAL_ERROR', message: String((e as Error).message ?? e) } },
      500,
    )
  }
})


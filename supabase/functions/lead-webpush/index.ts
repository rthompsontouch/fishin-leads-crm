/**
 * Web Push: send a "new lead" notification to all browser subscriptions for the lead owner.
 *
 * This function is intended to be called via a Database Webhook on:
 *   public.lead_push_events (INSERT)
 *
 * It expects VAPID keys to be stored in Edge Secrets:
 *   - VAPID_KEYS_JSON (stringified object from webpush.exportVapidKeys())
 *   - VAPID_CONTACT_EMAIL (e.g. "you@yourcompany.com")
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush'

type JsonObject = Record<string, unknown>

type LeadPushEventRecord = {
  id?: string
  owner_id: string
  lead_id: string
  created_at?: string
}

type DatabaseWebhookPayload = {
  schema?: string
  table?: string
  type?: 'INSERT' | string
  record?: LeadPushEventRecord
}

/** Browser calls from the CRM origin need CORS; DB webhooks do not send Origin. */
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

function stripUndefined<T extends JsonObject>(obj: T): T {
  const out: JsonObject = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as T
}

function leadPreview(lead: {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  email?: string | null
  phone?: string | null
}) {
  const company = lead.company?.trim()
  const email = lead.email?.trim()
  const phone = lead.phone?.trim()
  const first = lead.first_name?.trim()
  const last = lead.last_name?.trim()
  const name = [first, last].filter(Boolean).join(' ')

  const top = company || name || 'New lead'
  const subParts = [email, phone].filter(Boolean)
  const sub = subParts.length > 0 ? subParts.slice(0, 2).join(' • ') : undefined

  return { title: 'New lead', body: sub ? `${top}\n${sub}` : top }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeadersFor(req),
    })
  }

  if (req.method !== 'POST') {
    return json(req, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
  }

  try {
    const payload = (await req.json()) as DatabaseWebhookPayload
    const record = payload.record
    if (!record?.owner_id || !record.lead_id) {
      return json(req, { ok: false, error: { code: 'BAD_PAYLOAD', message: 'Missing owner_id or lead_id.' } }, 400)
    }

    const vapidKeysJson = Deno.env.get('VAPID_KEYS_JSON')
    const contactEmail = Deno.env.get('VAPID_CONTACT_EMAIL') ?? 'admin@example.com'
    if (!vapidKeysJson) {
      return json(req, { ok: false, error: { code: 'MISSING_VAPID_KEYS_JSON' } }, 500)
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!serviceRoleKey || !supabaseUrl) {
      return json(req, { ok: false, error: { code: 'MISSING_SUPABASE_CONFIG' } }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Import VAPID keys.
    const exportedKeys = JSON.parse(vapidKeysJson) as webpush.ExportedVapidKeys
    const vapidKeys = await webpush.importVapidKeys(exportedKeys)

    // Create app server for sending messages.
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: `mailto:${contactEmail}`,
      vapidKeys,
    })

    // Fetch subscriptions for the lead owner.
    const { data: subs, error: subsErr } = await supabase
      .from('notification_subscriptions')
      .select(['id', 'endpoint', 'p256dh', 'auth'].join(','))
      .eq('owner_id', record.owner_id)

    if (subsErr) throw subsErr

    const subscriptions = subs ?? []
    if (subscriptions.length === 0) {
      return json(req, { ok: true, sent: 0 })
    }

    // Load lead for better message text.
    const { data: lead } = await supabase
      .from('leads')
      .select(['first_name', 'last_name', 'company', 'email', 'phone'].join(','))
      .eq('id', record.lead_id)
      .single()

    const { title, body } = leadPreview((lead ?? {}) as any)
    const url = `/leads/${record.lead_id}`
    const payloadText = JSON.stringify(stripUndefined({ title, body, url }))

    let sent = 0
    for (const s of subscriptions) {
      const subscriber = appServer.subscribe({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      })

      try {
        await subscriber.pushTextMessage(payloadText, {
          urgency: webpush.Urgency.High,
          ttl: 60 * 10, // 10 minutes
        })
        sent += 1
      } catch (e) {
        // If the subscription is gone, you can optionally delete it.
        const err = e as unknown
        const maybeGone =
          typeof (err as any)?.isGone === 'function' ? (err as any).isGone() : false
        if (maybeGone && 'id' in (s ?? {})) {
          await supabase.from('notification_subscriptions').delete().eq('id', (s as any).id)
        }
      }
    }

    return json(req, { ok: true, sent })
  } catch (e) {
    return json(req, { ok: false, error: { code: 'INTERNAL_ERROR', message: String((e as Error).message ?? e) } }, 500)
  }
})


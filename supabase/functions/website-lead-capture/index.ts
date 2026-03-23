/**
 * Website lead capture — validates x-api-key (SHA-256 hash), rate limits via Upstash Redis,
 * inserts into `leads` using the service role. See SUPABASE.md for secrets.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Redis } from 'https://esm.sh/@upstash/redis@1.34.3'

/** Fixed window: max requests per IP per window (tune as needed). */
const RATE_WINDOW_SEC = 60
const RATE_MAX_PER_WINDOW = 60

function hexFromBytes(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return hexFromBytes(new Uint8Array(digest))
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const requestHeaders = req.headers.get('Access-Control-Request-Headers')

  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': origin ? 'true' : 'false',
    'Access-Control-Allow-Headers': requestHeaders ?? 'authorization, x-api-key, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonBody(
  data: unknown,
  status = 200,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

function err(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>,
  log?: Record<string, unknown>,
) {
  if (log) {
    console.error('[website-lead-capture]', JSON.stringify({ code, ...log }))
  } else {
    console.error('[website-lead-capture]', JSON.stringify({ code, message }))
  }
  return jsonBody({ ok: false, error: { code, message } }, status, headers)
}

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const cf = req.headers.get('cf-connecting-ip')
  if (cf?.trim()) return cf.trim()
  return 'unknown'
}

async function enforceRateLimit(
  ip: string,
  headers: Record<string, string>,
): Promise<Response | null> {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
  if (!url || !token) {
    console.warn(
      '[website-lead-capture] Rate limiting disabled: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
    )
    return null
  }

  try {
    const redis = new Redis({ url, token })
    const slot = Math.floor(Date.now() / 1000 / RATE_WINDOW_SEC)
    const key = `ratelimit:website-lead-capture:${ip}:${slot}`
    const n = await redis.incr(key)
    if (n === 1) {
      await redis.expire(key, RATE_WINDOW_SEC)
    }
    if (n > RATE_MAX_PER_WINDOW) {
      return err(
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        429,
        headers,
        { ip, count: n, windowSec: RATE_WINDOW_SEC },
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[website-lead-capture]', JSON.stringify({ code: 'REDIS_RATE_LIMIT_ERROR', message: msg }))
    // Fail open so a Redis outage does not block lead capture
  }
  return null
}

serve(async (req) => {
  const headers = corsHeaders(req)
  const ip = getClientIp(req)
  let stage = 'init'

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (req.method !== 'POST') {
      return err('METHOD_NOT_ALLOWED', 'Only POST is allowed.', 405, headers, { method: req.method, ip })
    }

    stage = 'rate_limit'
    const limited = await enforceRateLimit(ip, headers)
    if (limited) return limited

    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return err('MISSING_API_KEY', 'Missing x-api-key header.', 401, headers, { ip })
    }

    let payload: Record<string, unknown> | null = null
    try {
      payload = (await req.json()) as Record<string, unknown>
    } catch {
      return err('INVALID_JSON', 'Request body must be valid JSON.', 400, headers, { ip })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[website-lead-capture]', JSON.stringify({ code: 'SERVER_MISCONFIGURED', ip }))
      return err(
        'SERVER_MISCONFIGURED',
        'Server configuration error.',
        500,
        headers,
      )
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    stage = 'sha256'
    const apiKeyHash = await sha256Hex(apiKey)

    stage = 'lookup_integration'
    const { data: integration, error: integrationError } = await client
      .from('integrations')
      .select('id, owner_id, source_label, default_status, enabled')
      .eq('api_key_hash', apiKeyHash)
      .single()

    if (integrationError || !integration) {
      return err(
        'INVALID_API_KEY',
        'Invalid or disabled API key.',
        401,
        headers,
        { ip, stage, dbMessage: integrationError?.message },
      )
    }

    if (integration.enabled === false) {
      return err('INTEGRATION_DISABLED', 'This integration is disabled.', 403, headers, {
        ip,
        integrationId: integration.id,
      })
    }

    const p = payload ?? {}
    const first_name = (p.first_name ?? p.firstName ?? null) as string | null
    const last_name = (p.last_name ?? p.lastName ?? null) as string | null
    const company = (p.company ?? null) as string | null
    const industry = (p.industry ?? null) as string | null
    const company_size = (p.company_size ?? null) as string | null
    const website = (p.website ?? null) as string | null
    const email = (p.email ?? null) as string | null
    const phone = (p.phone ?? null) as string | null
    const details = (p.details ?? p.message ?? null) as string | null

    stage = 'insert_lead'
    const { data: lead, error: leadError } = await client
      .from('leads')
      .insert({
        owner_id: integration.owner_id,
        first_name,
        last_name,
        company,
        industry,
        company_size,
        website,
        email,
        phone,
        details: details,
        source: integration.source_label,
        status: integration.default_status,
        last_contacted_at: null,
      })
      .select(
        'id, owner_id, first_name, last_name, company, industry, company_size, website, email, phone, source, status, created_at',
      )
      .single()

    if (leadError) {
      console.error(
        '[website-lead-capture]',
        JSON.stringify({
          code: 'LEAD_INSERT_FAILED',
          message: leadError.message,
          ip,
          stage,
          details: leadError,
        }),
      )
      return err(
        'LEAD_INSERT_FAILED',
        'Could not save the lead. Check required fields and try again.',
        400,
        headers,
      )
    }

    return jsonBody({ ok: true, lead_id: lead.id }, 200, headers)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(
      '[website-lead-capture]',
      JSON.stringify({ code: 'INTERNAL_ERROR', message, stage, ip, stack: e instanceof Error ? e.stack : undefined }),
    )
    return err('INTERNAL_ERROR', 'An unexpected error occurred.', 500, headers)
  }
})

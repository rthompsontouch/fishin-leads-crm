import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders ?? {}),
    },
  })
}

function corsHeaders(req: Request) {
  // Browsers will block requests if:
  // - `Access-Control-Allow-Origin` is missing or mismatched
  // - credentials are used with `*` as the allow-origin
  // - the preflight requests headers that aren't listed in `Access-Control-Allow-Headers`
  const origin = req.headers.get('Origin')
  const requestHeaders = req.headers.get('Access-Control-Request-Headers')

  return {
    // If a specific Origin is provided, echo it back (required when credentials are involved).
    'Access-Control-Allow-Origin': origin ?? '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': origin ? 'true' : 'false',
    // Echo back requested headers for maximum compatibility.
    'Access-Control-Allow-Headers': requestHeaders ?? 'authorization, x-api-key, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

serve(async (req) => {
  const headers = corsHeaders(req)

  let stage = 'init'
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers })
    }

    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response('Missing x-api-key header', { status: 401, headers })
    }

    let payload: any = null
    try {
      payload = await req.json()
    } catch {
      return new Response('Invalid JSON body', { status: 400, headers })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          ok: false,
          error: 'Server misconfigured',
          missing: {
            SUPABASE_URL: !supabaseUrl,
            SUPABASE_SERVICE_ROLE_KEY: !serviceRoleKey,
          },
        },
        500,
        headers,
      )
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    stage = 'sha256'
    const apiKeyHash = await sha256Hex(apiKey)

    // Find the integration that owns this key.
    stage = 'lookup integration'
    const { data: integration, error: integrationError } = await client
      .from('integrations')
      // supabase-js expects a comma-separated string for select()
      .select('id, owner_id, source_label, default_status, enabled')
      .eq('api_key_hash', apiKeyHash)
      .single()

    if (integrationError || !integration || integration.enabled === false) {
      return new Response('Invalid API key', { status: 401, headers })
    }

    const first_name = payload?.first_name ?? payload?.firstName ?? null
    const last_name = payload?.last_name ?? payload?.lastName ?? null
    const company = payload?.company ?? null
    const industry = payload?.industry ?? null
    const company_size = payload?.company_size ?? null
    const website = payload?.website ?? null
    const email = payload?.email ?? null
    const phone = payload?.phone ?? null

    stage = 'insert lead'
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
        source: integration.source_label,
        status: integration.default_status,
        last_contacted_at: null,
      })
      .select(
        'id, owner_id, first_name, last_name, company, industry, company_size, website, email, phone, source, status, created_at',
      )
      .single()

    if (leadError) {
      return json({ ok: false, error: String(leadError.message) }, 400, headers)
    }

    return json(
      {
        ok: true,
        lead_id: lead.id,
      },
      200,
      headers,
    )
  } catch (e) {
    // If something unexpected happens, return JSON with CORS headers so the browser
    // doesn't fail with a misleading CORS error.
    const message = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : undefined
    const stack = e instanceof Error ? e.stack : undefined

    return json(
      {
        ok: false,
        error: message,
        stage,
        name,
        stack,
      },
      500,
      headers,
    )
  }
})


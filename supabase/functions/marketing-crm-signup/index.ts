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

function generatePlainApiKey() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `flk_${hexFromBytes(bytes)}`
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const requestHeaders = req.headers.get('Access-Control-Request-Headers')

  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    Vary: 'Origin',
    'Access-Control-Allow-Credentials': origin ? 'true' : 'false',
    'Access-Control-Allow-Headers':
      requestHeaders ?? 'authorization, x-api-key, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
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

function mustString(v: unknown, fieldName: string) {
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Missing or invalid field: ${fieldName}`)
  }
  return v.trim()
}

serve(async (req) => {
  const headers = corsHeaders(req)

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers })
    }

    let payload: any = null
    try {
      payload = await req.json()
    } catch {
      return json({ ok: false, error: 'Invalid JSON body' }, 400, headers)
    }

    // Required CRM signup inputs.
    const first_name = mustString(payload?.first_name ?? payload?.firstName, 'first_name')
    const last_name = mustString(payload?.last_name ?? payload?.lastName, 'last_name')
    const phone = mustString(payload?.phone, 'phone')
    const company_name = mustString(payload?.company_name ?? payload?.companyName, 'company_name')
    const industry = mustString(payload?.industry, 'industry')
    const company_size = mustString(payload?.company_size ?? payload?.companySize, 'company_size')
    const website = mustString(payload?.website, 'website')

    const tier = mustString(payload?.tier, 'tier')
    const email = mustString(payload?.email, 'email')
    const password = mustString(payload?.password, 'password')

    // Integration defaults (can be overridden from the marketing form).
    const integrationName = mustString(
      payload?.integration?.name ?? payload?.integration_name ?? 'Website Form',
      'integration.name',
    )
    const sourceLabel = mustString(
      payload?.integration?.source_label ?? payload?.source_label ?? 'Website',
      'integration.source_label',
    )
    const defaultStatus = mustString(
      payload?.integration?.default_status ?? payload?.default_status ?? 'New',
      'integration.default_status',
    )

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, error: 'Server misconfigured' }, 500, headers)
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // 1) Create CRM user in Supabase Auth.
    const { data: createUserData, error: userError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone,
        company_name,
        industry,
        company_size,
        website,
        tier,
      },
    })

    const userId = createUserData?.user?.id ?? createUserData?.id ?? null

    if (userError || !userId) {
      // Most likely case: email already exists.
      return json(
        {
          ok: false,
          error: String(userError?.message ?? 'Failed to create user'),
          user_id: userId,
        },
        400,
        headers,
      )
    }

    const display_name = [first_name, last_name].filter(Boolean).join(' ') || company_name

    // 2) Insert or update profile row.
    const { error: profileError } = await client
      .from('profiles')
      .upsert(
        {
          id: userId,
          company_name,
          tier,
          first_name,
          last_name,
          phone,
          industry,
          company_size,
          website,
          display_name,
        },
        { onConflict: 'id' },
      )

    if (profileError) {
      return json({ ok: false, error: String(profileError.message) }, 500, headers)
    }

    // 3) Create webhook integration (API key) for lead capture.
    const apiKey = generatePlainApiKey()
    const apiKeyHash = await sha256Hex(apiKey)

    const { data: integration, error: integrationError } = await client
      .from('integrations')
      .insert({
        owner_id: userId,
        name: integrationName,
        source_label: sourceLabel,
        api_key_hash: apiKeyHash,
        default_status: defaultStatus,
        enabled: true,
      })
      .select('id, name, source_label, default_status, enabled, created_at')
      .single()

    if (integrationError || !integration) {
      return json(
        { ok: false, error: String(integrationError?.message ?? 'Failed to create integration') },
        500,
        headers,
      )
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/website-lead-capture`

    return json(
      {
        ok: true,
        user_id: userId,
        integration_id: integration.id,
        api_key: apiKey,
        webhook_url: webhookUrl,
      },
      200,
      headers,
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return json({ ok: false, error: message }, 500, headers)
  }
})


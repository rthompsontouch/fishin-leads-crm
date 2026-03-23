import type { Database } from '../../../lib/supabase.types'
import { supabase } from '../../../lib/supabaseClient'

export type IntegrationRow = Database['public']['Tables']['integrations']['Row']

export type CreateIntegrationInput = {
  name: string
  source_label: string
  default_status: IntegrationRow['default_status']
  enabled?: boolean
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
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

export function generatePlainApiKey() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `flk_${bytesToHex(bytes)}`
}

export async function listIntegrations() {
  if (!supabase) throw new Error('Supabase client not configured')

  const { data, error } = await supabase
    .from('integrations')
    .select(['id', 'name', 'source_label', 'default_status', 'enabled', 'created_at'].join(','))
    .order('created_at', { ascending: false })
    .returns<IntegrationRow[]>()

  if (error) throw error
  return data
}

export async function getIntegrationById(integrationId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('integrations')
    .select(['id', 'name', 'source_label', 'default_status', 'enabled', 'created_at'].join(','))
    .eq('id', integrationId)
    .eq('owner_id', ownerId)
    .maybeSingle<IntegrationRow>()

  if (error) throw error
  return data
}

export async function createIntegration(input: CreateIntegrationInput) {
  if (!supabase) throw new Error('Supabase client not configured')

  const apiKey = generatePlainApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('integrations')
    .insert({
      owner_id: ownerId,
      name: input.name,
      source_label: input.source_label,
      default_status: input.default_status,
      enabled: input.enabled ?? true,
      api_key_hash: apiKeyHash,
    })
    .select(['id', 'name', 'source_label', 'default_status', 'enabled', 'created_at'].join(','))
    .single<IntegrationRow>()

  if (error) throw error
  return { integration: data, apiKey }
}

export async function regenerateIntegrationApiKey(integrationId: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const apiKey = generatePlainApiKey()
  const apiKeyHash = await sha256Hex(apiKey)
  const ownerId = await getUserId()

  const { data, error } = await supabase
    .from('integrations')
    .update({
      api_key_hash: apiKeyHash,
    })
    .eq('id', integrationId)
    .eq('owner_id', ownerId)
    .select(['id', 'name', 'source_label', 'default_status', 'enabled', 'created_at'].join(','))
    .single<IntegrationRow>()

  if (error) throw error
  return { integration: data, apiKey }
}

export async function deleteIntegration(integrationId: string) {
  if (!supabase) throw new Error('Supabase client not configured')
  const ownerId = await getUserId()

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', integrationId)
    .eq('owner_id', ownerId)

  if (error) throw error
}

export function getWebhookUrl() {
  const override = import.meta.env.VITE_WEBSITE_LEAD_CAPTURE_URL as string | undefined
  const trimmed = override?.trim()
  if (trimmed) return trimmed
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!baseUrl) return ''
  return `${baseUrl.replace(/\/$/, '')}/functions/v1/website-lead-capture`
}


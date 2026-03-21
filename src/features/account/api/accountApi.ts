import type { Database } from '../../../lib/supabase.types'
import { supabase } from '../../../lib/supabaseClient'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']

export async function getMyProfile(): Promise<ProfileRow | null> {
  if (!supabase) throw new Error('Supabase client not configured')

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  const userId = session?.user.id
  if (!userId) throw new Error('Not authenticated')

  // Use '*' so older DBs without company_logo_path still return a row (explicit column list errors if column missing).
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<ProfileRow>()

  if (error) {
    // If the row doesn't exist yet (marketing signup not wired), don't break the UI.
    // Supabase typically uses PGRST116 ("Results contain 0 rows") for .single().
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data ?? null
}

function normalizeStringToNull(v: string | null | undefined) {
  if (v === null || v === undefined) return null
  const t = v.trim()
  return t ? t : null
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
  return { userId, email: session?.user.email ?? null }
}

export type UpdateMyProfileInput = {
  company_name: string
  tier: ProfileRow['tier']
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  industry?: string | null
  company_size?: string | null
  website?: string | null
  /** Omit to leave unchanged when updating other fields */
  company_logo_path?: string | null
}

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<ProfileRow> {
  if (!supabase) throw new Error('Supabase client not configured')

  const { userId } = await getUserId()

  const firstName = normalizeStringToNull(input.first_name)
  const lastName = normalizeStringToNull(input.last_name)
  const phone = normalizeStringToNull(input.phone)
  const industry = normalizeStringToNull(input.industry)
  const companySize = normalizeStringToNull(input.company_size)
  const website = normalizeStringToNull(input.website)

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || input.company_name

  const row: Record<string, unknown> = {
    id: userId,
    company_name: input.company_name.trim(),
    tier: input.tier,
    first_name: firstName,
    last_name: lastName,
    phone,
    industry,
    company_size: companySize,
    website,
    display_name: displayName,
  }
  if (input.company_logo_path !== undefined) {
    row.company_logo_path = input.company_logo_path
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select(
      'id,company_name,tier,first_name,last_name,phone,industry,company_size,website,display_name,company_logo_path,created_at,updated_at',
    )
    .single<ProfileRow>()

  if (error) throw error
  return data
}

export async function changeMyEmail(
  currentPassword: string,
  newEmail: string,
): Promise<{ email: string | null }> {
  if (!supabase) throw new Error('Supabase client not configured')

  const { email: currentEmail } = await getUserId()
  if (!currentEmail) throw new Error('Current email not found')

  // Re-auth so Supabase accepts the update.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword,
  })
  if (signInError) throw signInError

  const { data, error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error

  return { email: data.user?.email ?? null }
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  if (!supabase) throw new Error('Supabase client not configured')

  const { email: currentEmail } = await getUserId()
  if (!currentEmail) throw new Error('Current email not found')

  // Re-auth so Supabase accepts the password update.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword,
  })
  if (signInError) throw signInError

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

const COMPANY_LOGOS_BUCKET = 'company-logos'

export function getCompanyLogoPublicUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null
  const { data } = supabase.storage.from(COMPANY_LOGOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function extFromFile(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  if (file.type === 'image/svg+xml') return 'svg'
  return 'png'
}

export async function uploadMyCompanyLogo(file: File): Promise<ProfileRow> {
  if (!supabase) throw new Error('Supabase client not configured')

  const { userId } = await getUserId()
  const ext = extFromFile(file)
  const objectPath = `${userId}/company-logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(COMPANY_LOGOS_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type || undefined })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, company_logo_path: objectPath },
      { onConflict: 'id' },
    )
    .select(
      'id,company_name,tier,first_name,last_name,phone,industry,company_size,website,display_name,company_logo_path,created_at,updated_at',
    )
    .single<ProfileRow>()

  if (error) throw error
  return data
}

export async function clearMyCompanyLogo(): Promise<ProfileRow> {
  if (!supabase) throw new Error('Supabase client not configured')

  const { userId } = await getUserId()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_logo_path')
    .eq('id', userId)
    .maybeSingle()

  const path = profile?.company_logo_path ?? null
  if (path) {
    const { error: removeError } = await supabase.storage.from(COMPANY_LOGOS_BUCKET).remove([path])
    if (removeError) throw removeError
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ company_logo_path: null })
    .eq('id', userId)

  if (updateError) throw updateError

  const row = await getMyProfile()
  if (!row) throw new Error('Profile not found')
  return row
}


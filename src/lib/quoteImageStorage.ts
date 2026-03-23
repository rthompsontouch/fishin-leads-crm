/**
 * Private quote-entry images live in Supabase Storage bucket `quote-images`.
 * Object path (within bucket): `{owner_id}/{quote_id}/{uuid}-{sanitized_filename}`
 *
 * RLS on `storage.objects` requires the first segment to match `auth.uid()` and
 * the second segment is used for traceability (not enforced for RLS).
 *
 * A SECURITY DEFINER trigger deletes storage objects when `quote_attachments`
 * rows are deleted, mirroring `service_attachments` behavior.
 */

export const QUOTE_IMAGES_BUCKET = 'quote-images' as const

/** Signed URL lifetime when displaying images (private bucket). */
export const QUOTE_IMAGE_SIGNED_URL_TTL_SEC = 60 * 60

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_')
}

/**
 * Build storage object name for an uploaded file.
 * Uses a random UUID so names are unique and collision-safe.
 */
export function buildQuoteImageStoragePath(
  ownerId: string,
  quoteId: string,
  rawFileName: string,
): string {
  const id = crypto.randomUUID()
  const safe = sanitizeFileName(rawFileName)
  return `${ownerId}/${quoteId}/${id}-${safe}`
}


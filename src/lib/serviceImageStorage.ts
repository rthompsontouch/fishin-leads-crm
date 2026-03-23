/**
 * Private service-entry images live in Supabase Storage bucket `service-images`.
 * Object path (within bucket): `{owner_id}/{service_id}/{uuid}-{sanitized_filename}`
 *
 * RLS on `storage.objects` requires the first segment to match `auth.uid()` and
 * the second to reference a `service_entries` row owned by the user.
 *
 * When a `service_attachments` row is deleted, migration
 * `20260325100000_db_storage_foundation_rls_triggers_cleanup.sql` removes the
 * matching `storage.objects` row (SECURITY DEFINER trigger) so files don’t linger.
 */

export const SERVICE_IMAGES_BUCKET = 'service-images' as const

/** Signed URL lifetime when displaying images (private bucket). */
export const SERVICE_IMAGE_SIGNED_URL_TTL_SEC = 60 * 60

/**
 * Build storage object name for an uploaded file.
 * Uses a random UUID so names are unique and collision-safe.
 */
export function buildServiceImageStoragePath(
  ownerId: string,
  serviceId: string,
  sanitizedFileName: string,
): string {
  const id = crypto.randomUUID()
  return `${ownerId}/${serviceId}/${id}-${sanitizedFileName}`
}

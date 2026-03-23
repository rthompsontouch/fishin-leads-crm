import type { ProfileRow } from '../features/account/api/accountApi'

/** True if the user should see the first-run onboarding flow. */
export function needsOnboarding(profile: ProfileRow | null | undefined): boolean {
  if (!profile) return true
  return profile.onboarding_completed_at == null
}

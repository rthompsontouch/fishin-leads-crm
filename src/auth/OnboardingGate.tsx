import { useQuery } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'
import { getMyProfile } from '../features/account/api/accountApi'
import { needsOnboarding } from '../lib/onboarding'

/**
 * Keeps authenticated users in `/onboarding` until they finish first-run setup.
 * Mount only around the main app shell — `/onboarding` is a sibling route.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const { data: profile, isPending } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => getMyProfile(),
  })

  if (isPending) {
    return (
      <div className="min-h-dvh grid place-items-center" style={{ background: 'var(--color-background)' }}>
        <div className="text-sm opacity-80">Loading...</div>
      </div>
    )
  }

  if (needsOnboarding(profile)) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'
import { getCompanyLogoPublicUrl, getMyProfile } from '../features/account/api/accountApi'
import type { ComponentType } from 'react'
import {
  Blocks,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react'
import { getBundledSidebarLogoUrl } from '../assets/brand/brandAssets'
import {
  fetchBrandManifest,
  pickSidebarLogoFile,
  publicAssetUrl,
} from '../lib/publicBrand'

type NavIcon = ComponentType<{ size?: number; className?: string }>

const navItems: Array<{
  href: string
  label: string
  icon: NavIcon
  /** Tailwind text color for the icon when the row is not active */
  iconColorClass: string
}> = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    iconColorClass: 'text-sky-500',
  },
  { href: '/leads', label: 'Leads', icon: Blocks, iconColorClass: 'text-violet-500' },
  {
    href: '/customers',
    label: 'Customers',
    icon: Users,
    iconColorClass: 'text-emerald-500',
  },
  {
    href: '/integrations',
    label: 'Integrations',
    icon: PlugZap,
    iconColorClass: 'text-amber-500',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    iconColorClass: 'text-slate-500',
  },
]

/** Extra URLs to try after manifest + bundled (uses BASE_URL for subpath deploys). */
const EXTRA_BRAND_NAMES = [
  'logo.png',
  'logo.svg',
  'company-logo.png',
  'company-logo.svg',
  'fishin-logo.png',
  'fishin-logo.svg',
] as const

function SidebarBrandMark() {
  const { data: manifest } = useQuery({
    queryKey: ['brand-manifest'],
    queryFn: fetchBrandManifest,
    staleTime: 60_000,
  })

  const candidates = useMemo(() => {
    const urls: string[] = []

    if (manifest?.files?.length) {
      const file = pickSidebarLogoFile(manifest.files)
      if (file) urls.push(publicAssetUrl(`brand/${file}`))
    }

    const bundled = getBundledSidebarLogoUrl()
    if (bundled) urls.push(bundled)

    for (const name of EXTRA_BRAND_NAMES) {
      urls.push(publicAssetUrl(`brand/${name}`))
    }

    return [...new Set(urls)]
  }, [manifest])

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setAttempt(0)
  }, [candidates])

  if (!candidates.length || attempt >= candidates.length) {
    return (
      <div className="text-center text-sm font-semibold tracking-tight px-2">
        Fishin Leads CRM
      </div>
    )
  }

  return (
    <img
      src={candidates[attempt]}
      alt="Fishin Leads CRM"
      title="Fishin Leads CRM"
      className="mx-auto max-h-10 max-w-[200px] w-auto object-contain object-center"
      onError={() => setAttempt((n) => n + 1)}
    />
  )
}

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      window.localStorage.setItem('sidebar-collapsed', isCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [isCollapsed])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const { data: profile, isPending: isProfilePending } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => getMyProfile(),
  })

  const companyLogoUrl = useMemo(
    () => getCompanyLogoPublicUrl(profile?.company_logo_path),
    [profile?.company_logo_path],
  )

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/login')
  }

  const companyLabel = profile?.company_name?.trim() || 'Your company'
  const tierLabel = profile?.tier ?? 'Freemium'

  /** Matches header hamburger / other neutral bordered controls */
  const shellIconButtonClass =
    'cursor-pointer rounded-md px-2 py-2 text-sm font-medium border transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]'

  return (
    <div
      className="min-h-dvh flex"
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-foreground)',
      }}
    >
      <aside
        className={[
          'shrink-0 border-r hidden md:flex md:flex-col sticky top-0 h-[100dvh] overflow-y-auto',
          isCollapsed ? 'w-20 px-3 py-2' : 'w-72 p-4',
        ].join(' ')}
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className={isCollapsed ? 'mb-3' : 'mb-6'}>
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsCollapsed((v) => !v)}
                className={[
                  'cursor-pointer w-full rounded-md py-2 flex items-center justify-center h-12',
                  'transition-colors hover:bg-[color:var(--color-surface-2)]',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]',
                ].join(' ')}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={22} className="shrink-0 text-slate-500" />
              </button>
            ) : (
              <div className="flex items-center gap-1 min-h-[2.5rem]">
                <Link
                  to="/dashboard"
                  className="cursor-pointer min-w-0 flex-1 flex justify-center items-center rounded-lg px-2 py-2 transition-colors hover:bg-[color:var(--color-surface-2)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  title="Dashboard"
                >
                  <SidebarBrandMark />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCollapsed((v) => !v)}
                  className={[
                    'cursor-pointer shrink-0 rounded-md h-12 w-12 flex items-center justify-center',
                    'transition-colors hover:bg-[color:var(--color-surface-2)]',
                    'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]',
                  ].join(' ')}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={18} className="shrink-0 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-2 flex-1 min-h-0">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/dashboard' &&
                  location.pathname.startsWith(item.href))

              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={[
                    'cursor-pointer w-full rounded-md py-2 flex items-center transition-colors',
                    isCollapsed ? 'justify-center px-0 h-12' : 'justify-start px-3',
                    isActive
                      ? 'bg-[color:var(--color-primary)] text-white'
                      : 'hover:bg-[color:var(--color-surface-2)]',
                  ].join(' ')}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    size={isCollapsed ? 22 : 18}
                    className={[
                      'shrink-0 transition-colors',
                      isActive ? 'text-white' : item.iconColorClass,
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'ml-3 font-medium text-sm',
                      isCollapsed ? 'hidden' : 'inline',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          <Link
            to="/settings"
            className={[
              'cursor-pointer block rounded-xl transition-colors outline-none focus-visible:outline-none hover:text-[color:var(--color-primary)]',
              'hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-2)] mb-2',
              isCollapsed ? 'h-12 w-12 mx-auto border' : 'border p-0',
            ].join(' ')}
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface-1)',
            }}
            title={isCollapsed ? 'Account settings' : undefined}
          >
            <div className={isCollapsed ? 'h-full w-full flex items-center justify-center' : 'p-3'}>
              <div className={isCollapsed ? 'flex justify-center' : ''}>
                {isCollapsed ? (
                  companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <User size={22} className="shrink-0" />
                  )
                ) : companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt=""
                    className={
                      isCollapsed
                        ? 'h-11 w-11 shrink-0 rounded-lg object-contain border'
                        : 'h-11 w-11 shrink-0 rounded-lg object-contain border'
                    }
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                ) : isCollapsed ? (
                  <div
                    className="h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center font-bold"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {(companyLabel[0] ?? '').toUpperCase()}
                  </div>
                ) : null}
              </div>

              {!isCollapsed ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">
                    Account
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-contain border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      {isProfilePending ? (
                        <div className="text-sm opacity-80">Loading…</div>
                      ) : (
                        <>
                          <div className="text-sm font-bold truncate leading-tight">
                            {companyLabel}
                          </div>
                          <div className="text-xs mt-1 opacity-85">
                            Tier:{' '}
                            <span
                              className="font-semibold"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {tierLabel}
                            </span>
                          </div>
                          <div className="text-[11px] mt-1.5 opacity-60 mb-1">
                            Account settings →
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </Link>

          <button
            type="button"
            onClick={() => void signOut()}
            className={[
              'group cursor-pointer mt-auto w-full rounded-md py-2.5 text-sm font-semibold border transition-colors duration-150',
              'flex items-center justify-center bg-transparent',
              'border-[color:var(--color-border)] text-[color:var(--color-foreground)]',
              'hover:bg-red-600 hover:border-red-600 hover:text-white',
              isCollapsed ? 'h-12 px-0 gap-0' : 'px-3 gap-2',
            ].join(' ')}
            title={isCollapsed ? 'Sign out' : undefined}
          >
            <LogOut
              size={isCollapsed ? 22 : 18}
              className="shrink-0 text-[color:var(--color-foreground)] transition-colors group-hover:text-white"
            />
            <span
              className={[
                isCollapsed ? 'hidden' : 'inline',
                'group-hover:text-white',
              ].join(' ')}
            >
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`md:hidden fixed top-3 left-4 z-40 shadow-sm ${shellIconButtonClass}`}
          style={{ background: 'var(--color-background)' }}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <main className="flex-1 overflow-y-auto px-6 pb-6 pt-1 max-md:pt-12 crm-scrollbar min-w-0">
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-[color:var(--color-background)] text-[color:var(--color-foreground)]"
          />

          <div className="relative h-full flex flex-col">
            <div
              className="h-16 flex items-center justify-between px-5 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Link
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-w-0"
              >
                <SidebarBrandMark />
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className={shellIconButtonClass}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="p-5 flex flex-col gap-2 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    location.pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={[
                      'cursor-pointer rounded-md px-3 py-3 text-sm font-medium flex items-center gap-3',
                      isActive
                        ? 'bg-[color:var(--color-primary)] text-white'
                        : 'hover:bg-[color:var(--color-surface-2)]',
                    ].join(' ')}
                  >
                    <Icon
                      size={18}
                      className={[
                        'shrink-0 transition-colors',
                        isActive ? 'text-white' : item.iconColorClass,
                      ].join(' ')}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="p-5 pb-6 flex flex-col gap-4">
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="cursor-pointer block rounded-xl border-2 p-3 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-2)] shadow-sm"
                style={{
                  borderColor: 'var(--color-primary)',
                  background: 'var(--color-surface-1)',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">
                  Account
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-contain border"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {isProfilePending ? (
                      <div className="text-sm opacity-80">Loading…</div>
                    ) : (
                      <>
                        <div className="text-sm font-bold truncate leading-tight">
                          {companyLabel}
                        </div>
                        <div className="text-xs mt-1 opacity-85">
                          Tier:{' '}
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {tierLabel}
                          </span>
                        </div>
                        <div className="text-[11px] mt-1.5 opacity-60">
                          Account settings →
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  void signOut()
                }}
                className="group cursor-pointer w-full rounded-md px-3 py-2.5 text-sm font-semibold border transition-colors duration-150 flex items-center justify-center gap-2 mt-auto border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-red-600 hover:border-red-600 hover:text-white"
              >
                <LogOut
                  size={18}
                  className="shrink-0 text-[color:var(--color-foreground)] group-hover:text-white transition-colors"
                />
                <span className="group-hover:text-white">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCompanyLogoPublicUrl, getMyProfile } from '../features/account/api/accountApi'
import type { ComponentType } from 'react'
import {
  Blocks,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Settings,
  User,
  UserCircle,
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

const topNavItems: Array<{
  href: string
  label: string
  icon: NavIcon
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
    href: '/jobs',
    label: 'Jobs',
    icon: ClipboardList,
    iconColorClass: 'text-orange-500',
  },
]

const settingsSubNav = [
  { href: '/settings#settings-account', label: 'Account information' },
  { href: '/settings#settings-security', label: 'Security' },
] as const

function isSettingsSubActive(href: string, pathname: string, hash: string) {
  const [path, fragment] = href.split('#')
  if (pathname !== path) return false
  if (!fragment) return true
  return hash === `#${fragment}`
}

const integrationSubNav = [
  { href: '/integrations/leads', label: 'Website & leads' },
  { href: '/integrations/api', label: 'REST API' },
] as const

function isIntegrationArea(pathname: string) {
  return pathname.startsWith('/integrations')
}

function isSettingsArea(pathname: string) {
  return pathname.startsWith('/settings')
}

function isIntegrationSubActive(href: string, pathname: string) {
  if (href === '/integrations/leads') {
    return pathname === '/integrations/leads' || pathname.startsWith('/integrations/leads/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Extra URLs to try after manifest + bundled (uses BASE_URL for subpath deploys). */
const EXTRA_BRAND_NAMES = [
  'logo.png',
  'logo.svg',
  'company-logo.png',
  'company-logo.svg',
  'fishin-logo.png',
  'fishin-logo.svg',
] as const

function SidebarBrandMark({
  compactLeft,
  mobileHeader,
}: {
  compactLeft?: boolean
  /** Top mobile bar: larger mark for touch / visibility */
  mobileHeader?: boolean
}) {
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
      <div
        className={[
          mobileHeader ? 'text-base font-semibold tracking-tight px-1' : 'text-sm font-semibold tracking-tight px-2',
          compactLeft ? 'text-left truncate' : 'text-center',
        ].join(' ')}
      >
        Fishin Leads CRM
      </div>
    )
  }

  const imgClass = mobileHeader
    ? 'max-h-[3.25rem] max-w-[min(100%,280px)] w-auto object-contain object-left object-top'
    : compactLeft
      ? 'max-h-8 max-w-[140px] w-auto object-contain object-left object-top'
      : 'max-h-10 max-w-[200px] w-auto object-contain mx-auto object-center'

  return (
    <img
      src={candidates[attempt]}
      alt="Fishin Leads CRM"
      title="Fishin Leads CRM"
      className={imgClass}
      onError={() => setAttempt((n) => n + 1)}
    />
  )
}

export default function AppShell() {
  const location = useLocation()

  /** Integrations sub-nav: toggle manually; open when entering /integrations*, close when leaving. */
  const [integrationsOpen, setIntegrationsOpen] = useState(() =>
    isIntegrationArea(location.pathname),
  )
  const integrationsPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = integrationsPathRef.current
    integrationsPathRef.current = location.pathname
    const nowInt = isIntegrationArea(location.pathname)
    const prevInt = isIntegrationArea(prev)
    if (nowInt && !prevInt) setIntegrationsOpen(true)
    if (!nowInt && prevInt) setIntegrationsOpen(false)
  }, [location.pathname])

  const [settingsOpen, setSettingsOpen] = useState(() =>
    isSettingsArea(location.pathname),
  )
  const settingsPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = settingsPathRef.current
    settingsPathRef.current = location.pathname
    const nowSet = isSettingsArea(location.pathname)
    const prevSet = isSettingsArea(prev)
    if (nowSet && !prevSet) setSettingsOpen(true)
    if (!nowSet && prevSet) setSettingsOpen(false)
  }, [location.pathname])

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

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobileMenuOpen])

  const { data: profile, isPending: isProfilePending } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => getMyProfile(),
  })

  const companyLogoUrl = useMemo(
    () => getCompanyLogoPublicUrl(profile?.company_logo_path),
    [profile?.company_logo_path],
  )

  const companyLabel = profile?.company_name?.trim() || 'Your company'
  const tierLabel = profile?.tier ?? 'Freemium'

  /** Matches header hamburger / other neutral bordered controls */
  const shellIconButtonClass =
    'cursor-pointer rounded-md px-2 py-2 text-sm font-medium border transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--crm-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]'

  /** Mobile top bar: 44px+ touch targets */
  const shellMobileHeaderIconButtonClass =
    'cursor-pointer rounded-xl min-h-12 min-w-12 inline-flex items-center justify-center border-2 transition-colors duration-150 border-[color:var(--color-border)] bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--crm-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]'

  return (
    <div
      className="min-h-dvh flex crm-shell"
      style={{
        background: 'var(--crm-shell-bg)',
        color: 'var(--color-foreground)',
      }}
    >
      <aside
        className={[
          'shrink-0 hidden md:flex md:flex-col sticky top-0 h-[100dvh] overflow-y-auto',
          isCollapsed ? 'w-20 pl-3 pr-0 py-2' : 'w-72 pl-4 pr-0 py-4',
        ].join(' ')}
      >
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div
            className={isCollapsed ? 'mb-0 -ml-3 -mt-2 pl-3' : 'mb-0 -ml-4 -mt-4 pl-4'}
            style={{ background: 'var(--crm-header-bg)' }}
          >
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsCollapsed((v) => !v)}
                className={[
                  'group cursor-pointer w-full rounded-md py-0 flex items-center justify-center h-12',
                  'bg-transparent transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]',
                ].join(' ')}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen
                  size={26}
                  className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
                />
              </button>
            ) : (
              <div className="flex items-center gap-1 min-h-[2.5rem]">
                <div
                  className="min-w-0 flex-1 flex justify-center items-center rounded-lg px-2 py-0"
                  title="Fishin Leads CRM"
                >
                  <SidebarBrandMark />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCollapsed((v) => !v)}
                  className={[
                    'group cursor-pointer shrink-0 rounded-md h-16 w-16 flex items-center justify-center',
                    'bg-transparent transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]',
                  ].join(' ')}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose
                    size={24}
                    className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
                  />
                </button>
              </div>
            )}
          </div>

          <nav
            className={[
              'flex flex-col gap-2 flex-1 min-h-0 min-w-0 pt-3',
              isCollapsed ? '-ml-3 pl-3 w-[calc(100%+0.75rem)]' : '-ml-4 pl-4 w-[calc(100%+1rem)]',
            ].join(' ')}
            style={{ background: 'var(--crm-sidebar-links-bg)' }}
          >
            {topNavItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={[
                    'cursor-pointer w-full rounded-md py-2 flex items-center transition-colors',
                    isCollapsed ? 'justify-center px-0 h-12' : 'justify-start px-3',
                    isActive
                      ? 'bg-[color:var(--crm-nav-active-bg)] text-[color:var(--crm-nav-active-text)] rounded-r-none'
                      : 'hover:bg-[color:var(--crm-nav-hover)] rounded-r-none',
                  ].join(' ')}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    size={isCollapsed ? 22 : 18}
                    className={[
                      'shrink-0 transition-colors',
                      isActive ? 'text-[color:var(--crm-nav-active-text)]' : item.iconColorClass,
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

            {isCollapsed ? (
              <Link
                to="/integrations/leads"
                className={[
                  'cursor-pointer w-full rounded-md py-2 flex items-center justify-center h-12 transition-colors',
                  isIntegrationArea(location.pathname)
                    ? 'bg-[color:var(--crm-nav-active-bg)] text-[color:var(--crm-nav-active-text)] rounded-r-none'
                    : 'hover:bg-[color:var(--crm-nav-hover)] rounded-r-none',
                ].join(' ')}
                title="Integrations"
              >
                <PlugZap
                  size={22}
                  className={[
                    'shrink-0 transition-colors',
                    isIntegrationArea(location.pathname)
                      ? 'text-[color:var(--crm-nav-active-text)]'
                      : 'text-amber-500',
                  ].join(' ')}
                />
              </Link>
            ) : (
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setIntegrationsOpen((v) => !v)}
                  className="cursor-pointer w-full rounded-md py-2 flex items-center gap-2 px-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] hover:bg-[color:var(--crm-nav-hover)] rounded-r-none"
                  aria-expanded={integrationsOpen}
                >
                  <PlugZap size={18} className="shrink-0 transition-colors text-amber-500" />
                  <span className="font-medium text-sm flex-1">Integrations</span>
                  {integrationsOpen ? (
                    <ChevronDown size={16} className="shrink-0 opacity-80" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 opacity-80" />
                  )}
                </button>
                {integrationsOpen ? (
                  <div
                    className="ml-3 pl-3 flex flex-col gap-0.5 border-l"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {integrationSubNav.map((sub) => {
                      const subActive = isIntegrationSubActive(sub.href, location.pathname)
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={[
                            'block w-full cursor-pointer rounded-l-md rounded-r-none py-1.5 px-2 text-sm font-medium transition-colors text-left',
                            subActive
                              ? 'bg-[color:var(--crm-nav-active-bg)] text-[color:var(--crm-nav-active-text)]'
                              : 'hover:bg-[color:var(--crm-nav-hover)]',
                          ].join(' ')}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )}

            {isCollapsed ? (
              <Link
                to="/settings"
                className={[
                  'cursor-pointer w-full rounded-md py-2 flex items-center justify-center h-12 transition-colors',
                  isSettingsArea(location.pathname)
                    ? 'bg-[color:var(--crm-nav-active-bg)] text-[color:var(--crm-nav-active-text)] rounded-r-none'
                    : 'hover:bg-[color:var(--crm-nav-hover)] rounded-r-none',
                ].join(' ')}
                title="Settings"
              >
                <Settings
                  size={22}
                  className={[
                    'shrink-0 transition-colors',
                    isSettingsArea(location.pathname)
                      ? 'text-[color:var(--crm-nav-active-text)]'
                      : 'text-slate-500',
                  ].join(' ')}
                />
              </Link>
            ) : (
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="cursor-pointer w-full rounded-md py-2 flex items-center gap-2 px-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] hover:bg-[color:var(--crm-nav-hover)] rounded-r-none"
                  aria-expanded={settingsOpen}
                >
                  <Settings size={18} className="shrink-0 transition-colors text-slate-500" />
                  <span className="font-medium text-sm flex-1">Settings</span>
                  {settingsOpen ? (
                    <ChevronDown size={16} className="shrink-0 opacity-80" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 opacity-80" />
                  )}
                </button>
                {settingsOpen ? (
                  <div
                    className="ml-3 pl-3 flex flex-col gap-0.5 border-l"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {settingsSubNav.map((sub) => {
                      const active = isSettingsSubActive(sub.href, location.pathname, location.hash)
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={[
                            'block w-full cursor-pointer rounded-l-md rounded-r-none py-1.5 px-2 text-sm font-medium transition-colors text-left',
                            active
                              ? 'bg-[color:var(--crm-nav-active-bg)] text-[color:var(--crm-nav-active-text)]'
                              : 'hover:bg-[color:var(--crm-nav-hover)]',
                          ].join(' ')}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </nav>

          <Link
            to="/settings"
            className={[
              'group cursor-pointer relative block transition-colors outline-none focus-visible:outline-none mt-auto',
              isCollapsed
                ? '-ml-3 -mb-2 w-[calc(100%+0.75rem)] h-12 rounded-none'
                : '-ml-4 -mb-4 pl-4 pr-4 py-2 rounded-none',
            ].join(' ')}
            style={{
              background: 'var(--crm-header-bg)',
            }}
            title={isCollapsed ? 'Account settings' : undefined}
          >
            <div className={isCollapsed ? 'h-full w-full flex items-center justify-center' : 'p-3'}>
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
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-contain border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                    ) : (
                      <div
                        className="h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center text-sm font-bold"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {(companyLabel[0] ?? '').toUpperCase()}
                      </div>
                    )}

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
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {!isCollapsed ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
                &gt;
              </span>
            ) : null}
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-2 border-b shadow-sm"
          style={{
            paddingTop: 'max(0.35rem, env(safe-area-inset-top))',
            paddingLeft: 'max(0.65rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.65rem, env(safe-area-inset-right))',
            paddingBottom: '0.35rem',
            background: 'var(--crm-header-bg)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        >
          <div className="min-w-0 flex-1 flex items-center min-h-12">
            <div className="min-w-0 max-w-[min(100%,18rem)] pr-1">
              <SidebarBrandMark compactLeft mobileHeader />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/settings"
              className={`${shellMobileHeaderIconButtonClass} shadow-sm`}
              style={{ background: 'color-mix(in srgb, var(--color-background) 55%, transparent)' }}
              aria-label="Account and settings"
            >
              <UserCircle size={26} className="shrink-0 opacity-95" strokeWidth={2} />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`${shellMobileHeaderIconButtonClass} shadow-sm`}
              style={{ background: 'color-mix(in srgb, var(--color-background) 55%, transparent)' }}
              aria-label="Open menu"
            >
              <Menu size={26} strokeWidth={2.25} />
            </button>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto px-6 pb-6 pt-1 crm-scrollbar min-w-0 max-md:pt-[calc(max(0.35rem,env(safe-area-inset-top,0px))+4.1rem)]"
          style={{ background: 'var(--crm-main-bg)' }}
        >
          <Outlet />
        </main>
      </div>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[60] md:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div
            className="relative z-10 flex h-[100dvh] w-[min(100%,20rem)] max-w-[92vw] flex-col border-l shadow-2xl"
            style={{
              background: 'var(--crm-sidebar-links-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          >
            <div
              className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b"
              style={{
                borderColor: 'var(--color-border)',
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
              }}
            >
              <span className="text-sm font-semibold truncate">Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className={shellIconButtonClass}
                style={{ background: 'var(--color-background)' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto crm-scrollbar">
              {topNavItems.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
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

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIntegrationsOpen((v) => !v)}
                  className="cursor-pointer w-full rounded-md px-3 py-3 text-sm font-medium flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-2)]"
                  aria-expanded={integrationsOpen}
                >
                  <PlugZap size={18} className="shrink-0 transition-colors text-amber-500" />
                  <span className="flex-1">Integrations</span>
                  {integrationsOpen ? (
                    <ChevronDown size={18} className="shrink-0 opacity-80" />
                  ) : (
                    <ChevronRight size={18} className="shrink-0 opacity-80" />
                  )}
                </button>
                {integrationsOpen ? (
                  <div
                    className="flex flex-col gap-0.5 ml-2 pl-3 border-l mt-1"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {integrationSubNav.map((sub) => {
                      const subActive = isIntegrationSubActive(sub.href, location.pathname)
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={[
                            'block w-full cursor-pointer rounded-l-md rounded-r-none px-3 py-2.5 text-sm font-medium text-left',
                            subActive
                              ? 'bg-[color:var(--color-primary)] text-white'
                              : 'hover:bg-[color:var(--color-surface-2)]',
                          ].join(' ')}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="cursor-pointer w-full rounded-md px-3 py-3 text-sm font-medium flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] hover:bg-[color:var(--color-surface-2)]"
                  aria-expanded={settingsOpen}
                >
                  <Settings size={18} className="shrink-0 transition-colors text-slate-500" />
                  <span className="flex-1">Settings</span>
                  {settingsOpen ? (
                    <ChevronDown size={18} className="shrink-0 opacity-80" />
                  ) : (
                    <ChevronRight size={18} className="shrink-0 opacity-80" />
                  )}
                </button>
                {settingsOpen ? (
                  <div
                    className="flex flex-col gap-0.5 ml-2 pl-3 border-l mt-1"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {settingsSubNav.map((sub) => {
                      const active = isSettingsSubActive(sub.href, location.pathname, location.hash)
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={[
                            'block w-full cursor-pointer rounded-l-md rounded-r-none px-3 py-2.5 text-sm font-medium text-left',
                            active
                              ? 'bg-[color:var(--color-primary)] text-white'
                              : 'hover:bg-[color:var(--color-surface-2)]',
                          ].join(' ')}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </nav>

            <div
              className="p-4 pt-2 flex flex-col gap-4 shrink-0 border-t"
              style={{
                borderColor: 'var(--color-border)',
                paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              }}
            >
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
                <div className="flex items-center gap-3 min-w-0">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-contain border"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  ) : (
                    <div
                      className="h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center text-sm font-bold"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {(companyLabel[0] ?? '').toUpperCase()}
                    </div>
                  )}
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
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

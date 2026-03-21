/** Vite `public/` is served under import.meta.env.BASE_URL (usually `/`). */

export function publicAssetUrl(subpath: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}${subpath.replace(/^\//, '')}`
}

export type BrandManifest = { files: string[] }

export async function fetchBrandManifest(): Promise<BrandManifest | null> {
  try {
    const url = publicAssetUrl('brand/__manifest__.json')
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const data = (await r.json()) as BrandManifest
    if (!data?.files?.length) return null
    return data
  } catch {
    return null
  }
}

const SKIP_SIDEBAR = (name: string) =>
  /^readme\.txt$/i.test(name) ||
  /^__manifest__\.json$/i.test(name) ||
  /^brand\.json$/i.test(name) ||
  /favicon/i.test(name) ||
  /apple-touch|apple_touch/i.test(name) ||
  name.toLowerCase().endsWith('.ico')

/** Pick best file from public/brand for the sidebar mark */
export function pickSidebarLogoFile(files: string[]): string | null {
  let usable = files.filter((f) => !SKIP_SIDEBAR(f))

  // If everything was skipped (e.g. only "favicon.png"), use any non-.ico image except manifest/readme
  if (!usable.length) {
    usable = files.filter(
      (f) =>
        !/^readme\.txt$/i.test(f) &&
        !/^__manifest__\.json$/i.test(f) &&
        !/^brand\.json$/i.test(f) &&
        !/\.ico$/i.test(f),
    )
  }

  if (!usable.length) return null

  const score = (name: string) => {
    const l = name.toLowerCase()
    if (/logo|wordmark|brand|company|fishin|mark|crm/.test(l)) return 0
    if (/icon/.test(l)) return 1
    return 2
  }

  return [...usable].sort((a, b) => score(a) - score(b) || a.localeCompare(b))[0] ?? null
}

export function pickFaviconFile(files: string[]): string | null {
  const lower = (f: string) => f.toLowerCase()
  const exactIco = files.find((f) => lower(f) === 'favicon.ico')
  if (exactIco) return exactIco
  const exactSvg = files.find((f) => lower(f) === 'favicon.svg')
  if (exactSvg) return exactSvg
  return (
    files.find((f) => /favicon/i.test(f) && /\.(ico|svg|png|jpe?g|webp|gif)$/i.test(f)) ?? null
  )
}

export function pickAppleTouchFile(files: string[]): string | null {
  return (
    files.find((f) => /apple-touch|apple_touch/i.test(f) && /\.(png|jpg|webp)$/i.test(f)) ??
    null
  )
}

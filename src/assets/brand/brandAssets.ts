/**
 * Brand files in this folder are bundled by Vite (dev + production).
 *
 * Put your images here (NOT in dist/ — dist is erased on each build):
 *   - Logo: e.g. logo.png, logo.svg, company-logo.png
 *   - Favicon: favicon.ico and/or favicon.svg
 *   - Optional: apple-touch-icon.png
 *
 * Do not use "dist/assets/brand" — use "src/assets/brand" only.
 */

const brandModules = import.meta.glob<string>('./*.{png,jpg,jpeg,svg,webp,gif,ico}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function basename(path: string) {
  const seg = path.split('/').pop() ?? path
  return seg.replace(/^\.\//, '')
}

const entries = Object.entries(brandModules).map(([path, url]) => ({
  path,
  url,
  name: basename(path).toLowerCase(),
}))

/** Sidebar / shell mark: any image except obvious favicon / touch icons */
export function getBundledSidebarLogoUrl(): string | null {
  const excluded = (name: string) =>
    /favicon|apple-touch|apple_touch|touch-icon|\.ico$/.test(name)

  const preferred = entries.filter(
    (e) =>
      !excluded(e.name) &&
      /logo|mark|wordmark|brand|company|fishin|crm/.test(e.name),
  )
  if (preferred.length) {
    preferred.sort((a, b) => a.name.localeCompare(b.name))
    return preferred[0].url
  }

  const rest = entries.filter((e) => !excluded(e.name))
  if (rest.length) {
    rest.sort((a, b) => a.name.localeCompare(b.name))
    return rest[0].url
  }

  return null
}

export function getBundledFaviconUrl(): string | null {
  const ico = entries.find((e) => e.name === 'favicon.ico')
  if (ico) return ico.url
  const svg = entries.find((e) => e.name === 'favicon.svg')
  if (svg) return svg.url
  const any = entries.find((e) => e.name.includes('favicon'))
  return any?.url ?? null
}

export function getBundledAppleTouchUrl(): string | null {
  const hit = entries.find((e) => /apple-touch|apple_touch/.test(e.name))
  return hit?.url ?? null
}

import {
  fetchBrandManifest,
  pickAppleTouchFile,
  pickFaviconFile,
  publicAssetUrl,
} from '../../lib/publicBrand'
import { getBundledAppleTouchUrl, getBundledFaviconUrl } from './brandAssets'

function setOrCreateLink(rel: string, attr: string, href: string, type?: string) {
  let link = document.querySelector(`link[${attr}]`) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    link.setAttribute(attr, '1')
    if (rel === 'icon') document.head.prepend(link)
    else document.head.appendChild(link)
  }
  link.href = href
  if (type) link.type = type
  else if (rel === 'icon' && !href.endsWith('.svg')) link.removeAttribute('type')
  else if (rel === 'icon' && href.endsWith('.svg')) link.type = 'image/svg+xml'
}

function setAllRelIconHrefs(href: string) {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"]',
    ),
  )
  for (const link of links) {
    link.href = href
    if (href.endsWith('.svg')) link.type = 'image/svg+xml'
    else link.removeAttribute('type')
  }
}

/**
 * 1) Optional favicons bundled from src/assets/brand
 * 2) Then public/brand from __manifest__.json (any filenames)
 */
export function registerBrandHead() {
  const bundledFav = getBundledFaviconUrl()
  if (bundledFav) {
    setOrCreateLink('icon', 'data-fishin-favicon', bundledFav)
  }

  const bundledApple = getBundledAppleTouchUrl()
  if (bundledApple) {
    setOrCreateLink('apple-touch-icon', 'data-fishin-apple', bundledApple)
  }

  void fetchBrandManifest().then((m) => {
    if (!m?.files?.length) return

    const favName = pickFaviconFile(m.files)
    if (favName) {
      const href = publicAssetUrl(`brand/${favName}`)
      // Browser often selects the first existing <link rel="icon">; overwrite them.
      setAllRelIconHrefs(href)
      setOrCreateLink('icon', 'data-fishin-favicon', href)
    }

    const appleName = pickAppleTouchFile(m.files)
    if (appleName) {
      setOrCreateLink('apple-touch-icon', 'data-fishin-apple', publicAssetUrl(`brand/${appleName}`))
    }
  })
}

registerBrandHead()

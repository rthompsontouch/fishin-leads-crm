import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { ViteDevServer } from 'vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Lists image files in public/brand so the app can load the correct logo/favicon
 * regardless of the exact filename (as long as it's a normal image extension).
 */
function writeBrandManifest(root: string) {
  const dir = path.join(root, 'public', 'brand')
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const all = fs.readdirSync(dir)
    const files = all.filter((f) => {
      if (f.startsWith('.')) return false
      if (f === 'README.txt') return false
      if (f === '__manifest__.json') return false
      if (f === 'brand.example.json') return false
      return /\.(png|jpe?g|svg|webp|gif|ico)$/i.test(f)
    })
    const out = path.join(dir, '__manifest__.json')
    fs.writeFileSync(
      out,
      `${JSON.stringify({ files: files.sort((a, b) => a.localeCompare(b)) })}\n`,
    )
  } catch (e) {
    console.warn('[write-brand-manifest]', e)
  }
}

function brandManifestPlugin(root: string) {
  const brandDir = path.join(root, 'public', 'brand')
  return {
    name: 'write-brand-manifest',
    buildStart() {
      writeBrandManifest(root)
    },
    configureServer(server: ViteDevServer) {
      writeBrandManifest(root)
      server.watcher.add(brandDir)
      const maybeRefresh = (file: string) => {
        const n = path.normalize(file)
        if (n.startsWith(path.normalize(brandDir))) writeBrandManifest(root)
      }
      server.watcher.on('add', maybeRefresh)
      server.watcher.on('unlink', maybeRefresh)
      server.watcher.on('change', maybeRefresh)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), brandManifestPlugin(__dirname)],
})

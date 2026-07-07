/**
 * Post-build step: renders the public marketing pages (/, /privacy, /terms) to
 * static HTML and splices them into the SPA shell, so search engines and any
 * crawler that doesn't execute JS see real text content on the first response
 * instead of an empty <div id="root"></div>.
 *
 * Deliberately NOT using vite-plugin-prerender/Puppeteer here: this project
 * builds with rolldown-vite (vite@8), and a Puppeteer-based prerenderer adds a
 * ~300MB Chromium download plus real flakiness risk to the Vercel build for a
 * plugin that hasn't been updated in years. This script instead reuses Vite's
 * own supported SSR build path (react-dom/server + a dedicated vite.ssr.config.ts)
 * with no extra native/browser dependency.
 *
 * Best-effort by design: any failure here is logged and swallowed so a bug in
 * prerendering can never break the deployable client build, which is already
 * complete and correct by the time this script runs.
 */
import { build } from 'vite'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { pathToFileURL } from 'url'
import path from 'path'

const root = process.cwd()
const mode = process.env.PRERENDER_MODE || 'production'

const ROUTES = [
  {
    path: '/',
    out: 'dist/index.html',
    title: 'AgriManagerX — Farm Management App for Poultry, Fish, Crops & Livestock',
    description:
      'Track eggs, feed, mortality, and profit — from your phone, even without internet. Manage poultry, fish, cattle, crops, inventory, payroll, and invoicing. Free to start.',
  },
  {
    path: '/privacy',
    out: 'dist/privacy/index.html',
    title: 'Privacy Policy — AgriManagerX',
    description: 'How AgriManagerX collects, uses, stores, and protects your farm and account data.',
  },
  {
    path: '/terms',
    out: 'dist/terms/index.html',
    title: 'Terms of Service — AgriManagerX',
    description: 'The terms governing your use of the AgriManagerX farm management application.',
  },
]

function escapeForHtml(html) {
  // The rendered markup is inserted verbatim (it's already HTML) — nothing to escape here.
  return html
}

async function main() {
  await build({
    configFile: path.resolve(root, 'vite.ssr.config.ts'),
    mode,
    logLevel: 'warn',
  })

  const entryUrl = pathToFileURL(path.resolve(root, 'dist-ssr/entry-server.mjs')).href
  const { renderPage } = await import(entryUrl)

  const shellPath = path.resolve(root, 'dist/index.html')
  const shell = readFileSync(shellPath, 'utf-8')

  for (const route of ROUTES) {
    const html = renderPage(route.path)

    let page = shell.replace('<div id="root"></div>', `<div id="root">${escapeForHtml(html)}</div>`)
    page = page.replace(/<title>.*?<\/title>/s, `<title>${route.title}</title>`)
    page = page.replace(
      /(<meta name="description" content=")[^"]*(")/,
      `$1${route.description}$2`
    )
    page = page.replace(
      /(<meta property="og:title" content=")[^"]*(")/,
      `$1${route.title}$2`
    )
    page = page.replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${route.description}$2`
    )

    const outPath = path.resolve(root, route.out)
    mkdirSync(path.dirname(outPath), { recursive: true })
    writeFileSync(outPath, page)
    console.log(`[prerender] ${route.path} → ${route.out} (${(html.length / 1024).toFixed(1)} KB of markup)`)
  }

  rmSync(path.resolve(root, 'dist-ssr'), { recursive: true, force: true })
}

main().catch((err) => {
  console.warn('[prerender] Skipped — SSR prerender failed, shipping the client-only SPA shell instead.')
  console.warn(err)
})

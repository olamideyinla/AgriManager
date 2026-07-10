/**
 * Post-build step that fixes the "every route serves the homepage" problem.
 *
 * Two jobs:
 *
 * 1. Renders EVERY public marketing page to its own static dist/<route>/index.html
 *    with correct title, description, canonical, and og:url. Vercel serves files
 *    from the filesystem before applying rewrites, so /features gets
 *    dist/features/index.html — not the SPA fallback. Crawlers and first paint
 *    see the right content per route.
 *
 * 2. Writes dist/app.html — a pristine copy of the SPA shell with NO prerendered
 *    markup — which vercel.json rewrites all remaining (app/auth) routes to.
 *    Without this, the rewrite fallback was dist/index.html, which contains the
 *    fully prerendered HOMEPAGE, so /dashboard, /features (pre-fix), and every
 *    other route served homepage content, title, and canonical at the HTTP level.
 *
 * Deliberately NOT using vite-plugin-prerender/Puppeteer: this project builds
 * with rolldown-vite (vite@8), and a Puppeteer-based prerenderer adds a ~300MB
 * Chromium download plus real flakiness risk to the Vercel build. This script
 * reuses Vite's own supported SSR build path instead.
 *
 * app.html is written before the SSR build so that even if prerendering fails,
 * the SPA rewrite target exists and the site still works; page prerender
 * failures are logged and swallowed.
 */
import { build } from 'vite'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { pathToFileURL } from 'url'
import path from 'path'

const root = process.cwd()
const mode = process.env.PRERENDER_MODE || 'production'

const SITE_ORIGIN = 'https://www.agrimanagerx.com'

// Titles/descriptions must mirror what each page sets client-side via
// usePageMeta/usePageTitle, so there's no flicker or crawler/browser mismatch.
const ROUTES = [
  {
    path: '/',
    out: 'dist/index.html',
    title: 'AgriManagerX — Farm Management App for Poultry, Fish, Crops & Livestock',
    description:
      'Track eggs, feed, mortality, and profit — from your phone, even without internet. Manage poultry, fish, cattle, crops, inventory, payroll, and invoicing. Free to start.',
  },
  {
    path: '/features',
    out: 'dist/features/index.html',
    title: 'Features — AgriManagerX',
    description:
      'Six farm management modules in one platform: livestock, crops, machinery, inventory, reporting, and an offline-first mobile app.',
  },
  {
    path: '/about',
    out: 'dist/about/index.html',
    title: 'About Us — AgriManagerX',
    description:
      'Why AgriManagerX exists: giving every growing farm the operational power of a large enterprise, in a tool every farmhand can use.',
  },
  {
    path: '/pricing',
    out: 'dist/pricing/index.html',
    title: 'Pricing — AgriManagerX',
    description:
      'Simple, transparent farm software pricing in your local currency. Start free, upgrade when you are ready.',
  },
  {
    path: '/demo',
    out: 'dist/demo/index.html',
    title: 'Book a Demo — AgriManagerX',
    description:
      'A 30-minute live walkthrough of AgriManagerX set up for a farm like yours. No sales script, no obligation.',
  },
  {
    path: '/contact',
    out: 'dist/contact/index.html',
    title: 'Contact Us — AgriManagerX',
    description: 'Questions or feedback about AgriManagerX? Get in touch — we respond within one business day.',
  },
  {
    path: '/partners',
    out: 'dist/partners/index.html',
    title: 'Become a Partner — AgriManagerX',
    description:
      'Earn commission referring farmers to AgriManagerX. Apply to the partner programme — no tech background required.',
  },
  {
    path: '/partners/apply',
    out: 'dist/partners/apply/index.html',
    title: 'Apply to Partner — AgriManagerX',
    description: 'Apply to the AgriManagerX Partner programme in a few minutes.',
  },
  {
    path: '/solutions/livestock',
    out: 'dist/solutions/livestock/index.html',
    title: 'Livestock Operations — AgriManagerX',
    description:
      'A live picture of every animal and every flock — health, feed, growth, and losses — wherever you are.',
  },
  {
    path: '/solutions/crops',
    out: 'dist/solutions/crops/index.html',
    title: 'Crop & Field Management — AgriManagerX',
    description:
      'Every activity, every input, and every harvest logged per field — so you see performance building through the season.',
  },
  {
    path: '/solutions/machinery',
    out: 'dist/solutions/machinery/index.html',
    title: 'Farm Machinery & Assets — AgriManagerX',
    description:
      'Every machine on the books — service schedules, fuel logs, repair history, and true running cost.',
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

function renderRouteHtml(shell, route, markup) {
  let page = shell.replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
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
  const canonicalUrl = `${SITE_ORIGIN}${route.path}`
  page = page.replace(
    /(<link rel="canonical" href=")[^"]*(")/,
    `$1${canonicalUrl}$2`
  )
  page = page.replace(
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${canonicalUrl}$2`
  )
  return page
}

async function main() {
  const shellPath = path.resolve(root, 'dist/index.html')
  const shell = readFileSync(shellPath, 'utf-8')

  // Clean SPA shell for app/auth routes — MUST exist before anything can fail,
  // because vercel.json rewrites unmatched routes to /app.html.
  writeFileSync(path.resolve(root, 'dist/app.html'), shell)
  console.log('[prerender] app shell → dist/app.html (clean, no prerendered markup)')

  await build({
    configFile: path.resolve(root, 'vite.ssr.config.ts'),
    mode,
    logLevel: 'warn',
  })

  const entryUrl = pathToFileURL(path.resolve(root, 'dist-ssr/entry-server.mjs')).href
  const { renderPage } = await import(entryUrl)

  for (const route of ROUTES) {
    try {
      const markup = renderPage(route.path)
      const page = renderRouteHtml(shell, route, markup)
      const outPath = path.resolve(root, route.out)
      mkdirSync(path.dirname(outPath), { recursive: true })
      writeFileSync(outPath, page)
      console.log(`[prerender] ${route.path} → ${route.out} (${(markup.length / 1024).toFixed(1)} KB of markup)`)
    } catch (err) {
      console.warn(`[prerender] FAILED ${route.path} — route will fall back to the clean SPA shell`)
      console.warn(err)
    }
  }

  rmSync(path.resolve(root, 'dist-ssr'), { recursive: true, force: true })
}

main().catch((err) => {
  console.warn('[prerender] Skipped — SSR prerender failed, shipping the client-only SPA shell instead.')
  console.warn(err)
})

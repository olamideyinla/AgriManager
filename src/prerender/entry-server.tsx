import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import LandingPage from '../features/landing/LandingPage'
import PrivacyPage from '../features/landing/PrivacyPage'
import TermsPage from '../features/landing/TermsPage'

const PAGES: Record<string, ComponentType> = {
  '/': LandingPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
}

/**
 * Renders a public marketing route to a static HTML string, for splicing into
 * the SPA shell at build time so crawlers see real content on first response.
 * Effects never run under renderToStaticMarkup, so any hook that does browser
 * feature-detection (geolocation, IntersectionObserver, etc.) in an effect is
 * simply skipped — those pages fall back to their default/loading render,
 * which is fine here since only text content matters for this pass.
 */
export function renderPage(path: string): string {
  const Page = PAGES[path]
  if (!Page) throw new Error(`No prerender mapping for path "${path}"`)

  return renderToStaticMarkup(
    <StaticRouter location={path}>
      <Page />
    </StaticRouter>
  )
}

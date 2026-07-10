import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter, Routes, Route } from 'react-router-dom'
import LandingPage from '../features/landing/LandingPage'
import PrivacyPage from '../features/landing/PrivacyPage'
import TermsPage from '../features/landing/TermsPage'
import ContactPage from '../features/landing/ContactPage'
import FeaturesPage from '../features/landing/FeaturesPage'
import SolutionPage from '../features/landing/SolutionPage'
import AboutPage from '../features/landing/AboutPage'
import PricingPage from '../features/landing/PricingPage'
import DemoPage from '../features/landing/DemoPage'
import LandingPartnersPage from '../features/partners/LandingPartnersPage'
import PartnerApplyPage from '../features/partners/PartnerApplyPage'

/**
 * path → { route pattern, component }. The pattern matters for pages that read
 * useParams (e.g. /solutions/:slug) — rendering the component bare inside
 * StaticRouter would leave params empty.
 */
const PAGES: Record<string, { pattern: string; Component: ComponentType }> = {
  '/':                     { pattern: '/',                 Component: LandingPage },
  '/privacy':              { pattern: '/privacy',          Component: PrivacyPage },
  '/terms':                { pattern: '/terms',            Component: TermsPage },
  '/contact':              { pattern: '/contact',          Component: ContactPage },
  '/features':             { pattern: '/features',         Component: FeaturesPage },
  '/about':                { pattern: '/about',            Component: AboutPage },
  '/pricing':              { pattern: '/pricing',          Component: PricingPage },
  '/demo':                 { pattern: '/demo',             Component: DemoPage },
  '/partners':             { pattern: '/partners',         Component: LandingPartnersPage },
  '/partners/apply':       { pattern: '/partners/apply',   Component: PartnerApplyPage },
  '/solutions/livestock':  { pattern: '/solutions/:slug',  Component: SolutionPage },
  '/solutions/crops':      { pattern: '/solutions/:slug',  Component: SolutionPage },
  '/solutions/machinery':  { pattern: '/solutions/:slug',  Component: SolutionPage },
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
  const entry = PAGES[path]
  if (!entry) throw new Error(`No prerender mapping for path "${path}"`)
  const { pattern, Component } = entry

  return renderToStaticMarkup(
    <StaticRouter location={path}>
      <Routes>
        <Route path={pattern} element={<Component />} />
      </Routes>
    </StaticRouter>
  )
}

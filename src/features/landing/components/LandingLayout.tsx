import type { ReactNode } from 'react'
import { LandingNav } from './LandingNav'
import { LandingFooter } from './LandingFooter'
import { WhatsAppButton } from './WhatsAppButton'

/** Shared shell for all public marketing pages (nav + footer + brand font). */
export function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
      <WhatsAppButton />
    </div>
  )
}

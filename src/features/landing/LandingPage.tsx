import { CurrencyProvider } from './context/CurrencyContext'
import { LandingNav } from './components/LandingNav'
import { HeroSection } from './components/HeroSection'
import { TrustBar } from './components/TrustBar'
import { ProblemSolution } from './components/ProblemSolution'
import { FeaturesSection } from './components/FeaturesSection'
import { HowItWorks } from './components/HowItWorks'
import { Testimonials } from './components/Testimonials'
import { PricingSection } from './components/PricingSection'
import { FAQSection } from './components/FAQSection'
import { ContactSection } from './components/ContactSection'
import { FinalCTA } from './components/FinalCTA'
import { LandingFooter } from './components/LandingFooter'
import { WhatsAppButton } from './components/WhatsAppButton'

export default function LandingPage() {
  return (
    <CurrencyProvider>
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <LandingNav />
        <main>
          <HeroSection />
          <TrustBar />
          <ProblemSolution />
          <FeaturesSection />
          <HowItWorks />
          <Testimonials />
          <PricingSection />
          <FAQSection />
          <ContactSection />
          <FinalCTA />
        </main>
        <LandingFooter />
        <WhatsAppButton />
      </div>
    </CurrencyProvider>
  )
}

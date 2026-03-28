import { LandingNav } from './components/LandingNav'
import { LandingFooter } from './components/LandingFooter'
import { ContactSection } from './components/ContactSection'

export default function ContactPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <LandingNav />
      <main className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mb-12 text-center">
          <h1 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-gray-500 text-lg font-body">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>
        <ContactSection standalone />
      </main>
      <LandingFooter />
    </div>
  )
}

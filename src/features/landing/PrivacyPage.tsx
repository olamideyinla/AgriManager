import { LandingNav } from './components/LandingNav'
import { LandingFooter } from './components/LandingFooter'

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <LandingNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <h1 className="font-display text-4xl text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>
              AgriManagerX collects information you provide directly, including your name, email address,
              phone number, and farm-related data such as production records, inventory, and financial
              transactions. We also collect basic usage data to improve the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information solely to provide and improve the AgriManagerX service. Your farm
              data is yours — we do not sell, share, or use it for advertising. Data is synced to our
              cloud servers to enable backup and multi-device access when you have an internet connection.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. Data Security</h2>
            <p>
              All data is encrypted in transit (TLS 1.3) and at rest. Access to your farm data is
              restricted to you and any team members you explicitly invite. We follow industry best
              practices to protect your information from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Your Rights</h2>
            <p>
              You may request a copy of your data, correction of inaccurate data, or deletion of your
              account at any time by contacting us via WhatsApp or email. Account deletion removes all
              personally identifiable information within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Contact</h2>
            <p>
              For privacy-related questions, contact us at{' '}
              <a href="mailto:privacy@agrimanagerx.com" className="text-primary-600 hover:underline">
                privacy@agrimanagerx.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

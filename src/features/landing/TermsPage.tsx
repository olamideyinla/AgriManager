import { LandingNav } from './components/LandingNav'
import { LandingFooter } from './components/LandingFooter'

export default function TermsPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <LandingNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <h1 className="font-display text-4xl text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using AgriManagerX, you agree to these Terms of Service.
              If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Use of the Service</h2>
            <p>
              AgriManagerX is a farm management tool for personal and commercial agricultural use.
              You agree not to misuse the service, attempt to gain unauthorized access, or use it
              for any unlawful purpose. You are responsible for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. Free and Pro Plans</h2>
            <p>
              The Free plan is provided at no cost and may have feature limitations. The Pro plan
              is available on a monthly or annual subscription. Pricing may change with 30 days'
              notice. You may cancel your Pro subscription at any time; no refunds are issued for
              partial billing periods.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Data Ownership</h2>
            <p>
              You retain full ownership of your farm data. By using AgriManagerX, you grant us a
              limited licence to store and process your data solely to provide the service. We do
              not claim ownership of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Limitation of Liability</h2>
            <p>
              AgriManagerX is provided "as is" without warranties of any kind. We are not liable
              for any indirect, incidental, or consequential damages arising from use of the service.
              Always maintain independent records for critical business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">6. Contact</h2>
            <p>
              For questions about these terms, contact us at{' '}
              <a href="mailto:legal@agrimanagerx.com" className="text-primary-600 hover:underline">
                legal@agrimanagerx.com
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

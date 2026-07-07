import { LandingLayout } from './components/LandingLayout'
import { usePageMeta } from '../../shared/hooks/usePageMeta'

const LAST_UPDATED = 'July 7, 2026'

export default function TermsPage() {
  usePageMeta(
    'Terms of Service — AgriManagerX',
    'The terms governing your use of the AgriManagerX farm management application.'
  )

  return (
    <LandingLayout>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-28 pb-20" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <h1 className="font-display text-4xl text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using AgriManagerX, you agree to these Terms of Service. If
              you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">2. Description of Service</h2>
            <p>
              AgriManagerX is a farm management application that helps farmers track production,
              finances, inventory, payroll, and operations. The service is provided as a Progressive
              Web App accessible via web browsers. The service includes free and paid subscription
              tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">3. Account Registration</h2>
            <p>
              You must provide accurate information when creating an account. You are responsible
              for maintaining the security of your account credentials. You must be at least 18
              years old to create an account. You are responsible for all activity that occurs under
              your account, including activity by team members you invite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">4. Subscription and Payment</h2>
            <p>
              AgriManagerX offers Free, Pro, and X subscription plans. Paid plans are billed monthly
              or annually as selected. Prices are displayed in your local currency and may vary by
              country. We reserve the right to change pricing with 30 days' notice to existing
              subscribers. Payments are processed by third-party payment providers. Refunds are
              available within 14 days of initial subscription if the service does not meet your
              expectations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">5. Your Data</h2>
            <p>
              You retain full ownership of all farm data you enter into AgriManagerX. We do not
              claim any intellectual property rights over your data. You grant us a limited license
              to store, process, and display your data solely for the purpose of providing the
              service to you. You can export your data at any time and request deletion of your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use the service for any illegal purpose.</li>
              <li>Attempt to access other users' data.</li>
              <li>Reverse engineer or attempt to extract source code.</li>
              <li>Use automated tools to scrape or extract data.</li>
              <li>Resell or redistribute the service without authorization.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">7. Service Availability</h2>
            <p>
              We aim to provide 99.9% uptime but do not guarantee uninterrupted service. The offline
              functionality of the app ensures you can continue recording data even when our servers
              are unavailable. Scheduled maintenance will be communicated in advance where possible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">8. Limitation of Liability</h2>
            <p>
              AgriManagerX is a management tool, not a substitute for professional advice. We are not
              liable for farming decisions made based on data or calculations in the app. Payroll
              calculations are provided as a management aid — verify statutory deductions with a
              qualified tax professional. Our total liability to you for any claim arising from the
              service is limited to the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">9. Termination</h2>
            <p>
              You may cancel your account at any time. Upon cancellation of a paid plan, you retain
              access until the end of your current billing period, after which you revert to the
              Free plan. Your data remains in your account on the Free plan. We may terminate or
              suspend your account if you violate these terms, with notice where practical.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the service after
              changes constitutes acceptance. We will notify you of material changes via email or
              in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes will
              be resolved through arbitration in Lagos, Nigeria.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">12. Contact</h2>
            <p>
              Questions about these Terms:{' '}
              <a href="mailto:legal@agrimanagerx.com" className="text-primary-600 hover:underline">
                legal@agrimanagerx.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </LandingLayout>
  )
}

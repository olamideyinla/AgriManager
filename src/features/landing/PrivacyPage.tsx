import { LandingLayout } from './components/LandingLayout'
import { usePageMeta } from '../../shared/hooks/usePageMeta'
import { whatsAppLink } from './config/contact'

const LAST_UPDATED = 'July 7, 2026'

export default function PrivacyPage() {
  usePageMeta(
    'Privacy Policy — AgriManagerX',
    'How AgriManagerX collects, uses, stores, and protects your farm and account data.'
  )

  return (
    <LandingLayout>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-28 pb-20" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <h1 className="font-display text-4xl text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">1. Introduction</h2>
            <p>
              AgriManagerX ("we", "us", "our") is committed to protecting the privacy of our users
              ("you", "your"). This Privacy Policy explains how we collect, use, store, and protect
              your information when you use our farm management application and website at
              agrimanagerx.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">2. Information We Collect</h2>
            <p className="mb-2">We collect the following information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account information:</strong> name, email address, phone number, farm name,
                and country when you create an account.
              </li>
              <li>
                <strong>Farm data:</strong> production records, financial transactions, inventory
                records, contact lists, animal records, and other data you enter into the
                application. This is your operational farm data.
              </li>
              <li>
                <strong>Device information:</strong> device type, operating system, browser type,
                and general location (country/region) for currency display and app optimization.
              </li>
              <li>
                <strong>Usage data:</strong> how you interact with the application (features used,
                pages visited, session duration) to improve the product. This data is anonymized
                and aggregated.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">3. How We Use Your Information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide and operate the AgriManagerX application.</li>
              <li>Sync your farm data across your devices.</li>
              <li>Process payments for paid subscriptions.</li>
              <li>Send you important notifications about your account and service updates.</li>
              <li>Improve the application based on anonymized usage patterns.</li>
              <li>Provide customer support.</li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900">
              We do NOT use your farm data for any purpose other than providing the service to you.
              We do NOT sell, rent, or share your farm data with third parties. We do NOT use your
              data for advertising or marketing by third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">4. Data Storage and Security</h2>
            <p className="mb-2">
              Your data is stored on your device (for offline access) and encrypted in our cloud
              infrastructure. We use Supabase as our cloud platform, which employs industry-standard
              security practices including:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Encryption in transit (TLS/HTTPS) and at rest.</li>
              <li>Row-Level Security ensuring each farm's data is completely isolated.</li>
              <li>Regular security audits and monitoring.</li>
            </ul>
            <p className="mt-3">
              Data backups are maintained to prevent loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">5. Data Ownership and Export</h2>
            <p className="mb-2">You own your farm data. At any time, you can:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Export all your data as CSV files from within the application (available on all plans, including Free).</li>
              <li>Request a complete copy of all data associated with your account by contacting us.</li>
              <li>Request deletion of your account and all associated data.</li>
            </ul>
            <p className="mt-3">
              We will never hold your data hostage or make it difficult to leave.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">6. Data Sharing</h2>
            <p className="mb-2">We share your data only in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>With team members you invite:</strong> workers, managers, and supervisors
                you add to your farm can see data you authorize them to access based on their role.
              </li>
              <li>
                <strong>With payment processors:</strong> when you subscribe to a paid plan, your
                payment information (not your farm data) is processed by our payment partner. We do
                not store your payment card details.
              </li>
              <li>
                <strong>With law enforcement:</strong> only when required by a valid legal order
                (court order, subpoena).
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900">
              We will never sell or share your farm data with advertisers, data brokers, or any
              third party for commercial purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">7. Cookies and Local Storage</h2>
            <p>
              AgriManagerX uses local storage (IndexedDB) on your device to store your farm data for
              offline access. We use minimal cookies for authentication session management. We do
              not use tracking cookies or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">8. Children's Privacy</h2>
            <p>
              AgriManagerX is not intended for children under 13. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes via the application or email. The "Last updated" date at the top of this page
              indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-body">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, contact us:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                Email:{' '}
                <a href="mailto:privacy@agrimanagerx.com" className="text-primary-600 hover:underline">
                  privacy@agrimanagerx.com
                </a>
              </li>
              <li>
                WhatsApp:{' '}
                <a href={whatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Chat with support
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </LandingLayout>
  )
}

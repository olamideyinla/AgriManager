import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LandingNav } from '../landing/components/LandingNav'
import { LandingFooter } from '../landing/components/LandingFooter'
import {
  DollarSign, Users, TrendingUp, CheckCircle, ChevronDown, ChevronUp,
  Briefcase, Leaf, HandshakeIcon, GraduationCap,
} from 'lucide-react'

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Do I need to be a tech expert?',
    a: 'No. If you can use WhatsApp, you can demonstrate AgriManagerX. We walk you through the demo in your onboarding call.',
  },
  {
    q: 'How and when do I get paid?',
    a: 'Commissions are calculated on the 1st of each month for the previous month\'s confirmed subscriptions. Payment is made by the 15th via bank transfer, M-Pesa, MTN MoMo, or PayPal. Minimum payout is $20.',
  },
  {
    q: 'What if a farmer contacts AgriManagerX directly after I introduced them?',
    a: 'As long as they signed up using your referral link at any point, the commission is yours.',
  },
  {
    q: 'What if a farmer I referred cancels and re-subscribes later?',
    a: 'If they re-subscribe within 6 months, you still earn the commission. After 6 months, the referral may be claimed by another partner.',
  },
  {
    q: 'Is the commission taxable?',
    a: 'In most countries, yes. You are responsible for declaring commission income per your local tax laws. We provide a monthly earnings statement you can use for your records.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 bg-gray-50 text-sm text-gray-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPartnersPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-white">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-4 bg-gradient-to-br from-primary-700 to-primary-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-accent/20 text-accent text-xs font-bold px-3 py-1 rounded-full mb-5 uppercase tracking-wide">
            Partner Program
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Earn 30% Referring Farmers
          </h1>
          <p className="text-lg text-primary-200 mb-8 max-w-xl mx-auto">
            Join AgriManagerX as a Commission Sales Partner. Share your referral link, help farmers discover the app, and earn monthly commissions as long as they stay subscribed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/partners/apply')}
              className="bg-accent text-primary-900 font-bold px-8 py-3.5 rounded-xl hover:bg-accent/90 transition-colors text-base w-full sm:w-auto"
            >
              Apply Now — It's Free
            </button>
            <button
              onClick={() => navigate('/partners/signin')}
              className="border border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base w-full sm:w-auto"
            >
              Partner Sign In
            </button>
          </div>
          <p className="text-xs text-primary-300 mt-4">No upfront cost · No monthly fees · Approved in 3 business days</p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { step: '1', icon: '📋', title: 'Apply', desc: 'Fill out the short partner application. We review and approve within 3 business days.' },
              { step: '2', icon: '✅', title: 'Get Approved', desc: 'Receive your unique referral link, WhatsApp script, and access to the partner dashboard.' },
              { step: '3', icon: '🔗', title: 'Share Your Link', desc: 'Send your link to farmers via WhatsApp, in-person demos, or any channel you prefer.' },
              { step: '4', icon: '💰', title: 'Earn Monthly', desc: 'Earn 30% commission on every Pro signup. 20% every time they renew. Paid monthly.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-1">Step {s.step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission Table ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3">Your Earnings</h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Clear, transparent commissions. No caps, no hidden rules.</p>

          {/* Standard rates */}
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-700 text-white">
                  <th className="text-left px-4 py-3 rounded-tl-xl">Sale Type</th>
                  <th className="text-right px-4 py-3 rounded-tr-xl">Your Commission</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Pro Monthly ($9/mo)', commission: '30% = $2.70 per active subscriber / month' },
                  { type: 'Pro Annual ($86/yr)',  commission: '30% = $25.80 upfront per sale' },
                  { type: 'Renewal (Year 2+)',    commission: '20% recurring as long as subscribed' },
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-gray-700">{row.type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-700">{row.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Volume bonuses */}
          <h3 className="font-bold text-gray-900 mb-4 text-center">Volume Bonuses — Earn More as You Grow</h3>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-500 text-white">
                  <th className="text-left px-4 py-3 rounded-tl-xl">Active Pro Subscribers Referred</th>
                  <th className="text-right px-4 py-3 rounded-tr-xl">Bonus</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { range: '10 – 24',  bonus: '+5% on all new sales that quarter' },
                  { range: '25 – 49',  bonus: '+10% on new sales + "Silver Partner" badge' },
                  { range: '50+',      bonus: '+15% on new sales + "Gold Partner" badge + priority support' },
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-amber-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{row.range}</td>
                    <td className="px-4 py-3 text-right text-amber-700 font-medium">{row.bonus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5 text-sm text-primary-800">
            <strong>Example:</strong> You sign up a poultry farm on the Pro Annual plan in Month 1. You earn <strong>$25.80 upfront</strong>. If they renew next year, you earn <strong>$17.20</strong> (20% of $86). If you sign up 25 farms in the quarter, all new sales earn an extra <strong>10%</strong>.
          </div>
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3">Who Becomes a Partner?</h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Anyone with a relationship with the farming community.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Leaf size={22} />, label: 'Agrovets & Feed Dealers' },
              { icon: <GraduationCap size={22} />, label: 'Extension Officers' },
              { icon: <Users size={22} />, label: 'Coop Society Leaders' },
              { icon: <Briefcase size={22} />, label: 'Farm Consultants' },
              { icon: <HandshakeIcon size={22} />, label: 'NGO Field Officers' },
              { icon: <GraduationCap size={22} />, label: 'Agri Graduates' },
              { icon: <DollarSign size={22} />, label: 'Rural Bank Officers' },
              { icon: <TrendingUp size={22} />, label: 'Anyone with Farm Networks' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex flex-col items-center text-center gap-2 shadow-sm">
                <div className="text-primary-600">{item.icon}</div>
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partner Toolkit ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3">Your Partner Toolkit</h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Everything you need to close deals confidently.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🔗', title: 'Unique Referral Link', desc: 'Every signup through your link is tracked to you automatically.' },
              { icon: '📊', title: 'Partner Dashboard', desc: 'See your referrals, conversion status, and earnings in real time.' },
              { icon: '💬', title: 'WhatsApp Pitch Script', desc: 'A short, conversational message you can send to farmers instantly.' },
              { icon: '📱', title: 'Demo Walk-through Guide', desc: 'A simple 5-minute script to show the app on a phone — no tech skills needed.' },
              { icon: '📄', title: 'Farmer Flyer (PDF)', desc: 'Printable one-pager in English + local language (Yoruba, Swahili, Twi, Hausa).' },
              { icon: '🎁', title: '30-Day Free Trial Link', desc: 'Give any farm a full 30-day Pro trial at no cost to close the deal.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start p-5 bg-gray-50 rounded-xl">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => <FAQItem key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20 px-4 bg-primary-700 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-3">Ready to Start Earning?</h2>
          <p className="text-primary-200 mb-8">Apply now — it takes 5 minutes. Approval in 3 business days.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/partners/apply')}
              className="bg-accent text-primary-900 font-bold px-8 py-3.5 rounded-xl hover:bg-accent/90 transition-colors text-base w-full sm:w-auto"
            >
              Apply Now
            </button>
            <button
              onClick={() => navigate('/partners/signin')}
              className="border border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base w-full sm:w-auto"
            >
              Sign In to Portal
            </button>
          </div>
          <p className="text-xs text-primary-300 mt-6">
            Questions? Email <a href="mailto:partners@agrimanagerx.com" className="underline">partners@agrimanagerx.com</a>
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}

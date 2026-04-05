import { useState } from 'react'
import { Copy, CheckCircle, MessageSquare, Smartphone, BookOpen, Link } from 'lucide-react'
import { usePartnerStore } from '../../../stores/partner-store'

const BASE_URL = 'https://agrimanagerx.com'

const WHATSAPP_SCRIPT = `Hi [Farmer's name]!

I came across an app that helps farmers track their flocks and finances right on their phone — even without internet. It's called AgriManagerX.

It records your daily production (eggs, feed, mortality) in under a minute, shows your profit/loss per flock, and even calculates payroll automatically.

A lot of farmers are saving hours every week. Can I show you a 5-minute demo?

You can also try it free for 30 days here: {LINK}`

const DEMO_GUIDE = `DEMO SCRIPT — 5 MINUTES

1. DAILY ENTRY (60 seconds)
   → Open the app → tap Daily Entry
   → Show how fast you record eggs, feed, mortality
   "This is what the farmer does every morning — takes less than a minute"

2. DASHBOARD (2 minutes)
   → Show profit/loss and production trends
   → Point to alerts for mortality spikes or vaccination reminders
   "The farm owner sees everything at a glance, even offline"

3. PAYROLL (2 minutes)
   → Show worker attendance tracking
   → Show automatic salary calculation
   "At the end of the month, payroll is already calculated — no manual work"

CLOSING LINE:
"Would you like to try it free for 30 days? No credit card needed. I can set it up with you right now."`

function CopyBlock({ label, text, icon }: { label: string; text: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          {icon}
          {label}
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-primary-600 font-medium hover:text-primary-700"
        >
          {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans overflow-x-auto">
        {text}
      </pre>
    </div>
  )
}

export default function PartnerToolkitPage() {
  const partner = usePartnerStore(s => s.partner)

  const referralLink = partner?.referralCode
    ? `${BASE_URL}/auth/signup?ref=${partner.referralCode}`
    : `${BASE_URL}/auth/signup (get approved to receive your link)`

  const whatsappText = WHATSAPP_SCRIPT.replace('{LINK}', referralLink)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-gray-900 text-lg">Partner Toolkit</h1>
        <p className="text-sm text-gray-500">Everything you need to pitch and close deals.</p>
      </div>

      {/* Quick links */}
      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-primary-800 mb-3 flex items-center gap-2">
          <Link size={15} /> Your Links
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-600 w-20 flex-shrink-0 font-medium">Referral:</span>
            <span className="text-xs font-mono text-primary-900 bg-white px-2 py-1 rounded border border-primary-200 flex-1 truncate">
              {referralLink}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-600 w-20 flex-shrink-0 font-medium">App:</span>
            <span className="text-xs font-mono text-primary-900 bg-white px-2 py-1 rounded border border-primary-200 flex-1 truncate">
              {BASE_URL}
            </span>
          </div>
        </div>
      </div>

      {/* WhatsApp script */}
      <CopyBlock
        label="WhatsApp Pitch Script"
        text={whatsappText}
        icon={<MessageSquare size={15} />}
      />

      {/* Demo guide */}
      <CopyBlock
        label="5-Minute Demo Guide"
        text={DEMO_GUIDE}
        icon={<Smartphone size={15} />}
      />

      {/* Selling tips */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50 text-gray-700 font-semibold text-sm">
          <BookOpen size={15} />
          Selling Tips
        </div>
        <div className="p-4 space-y-4 text-sm">
          {[
            {
              title: 'Best Prospects',
              body: '500+ layers or 1,000+ broilers · Dairy cattle · Fish ponds · Crop farms with hired labor · Cooperatives managing multiple member farms',
            },
            {
              title: 'Strong Hooks',
              body: '"Payroll is calculated automatically" — this closes most deals with farms that have workers.\n"Works offline" — critical for farmers with poor internet.\n"Your profit per flock is calculated automatically" — appeals to anyone keeping manual records.',
            },
            {
              title: 'Follow-Up Formula',
              body: 'Day 1: Send link + demo\nDay 7: Ask "Have you been using it? What has been most useful?"\nDay 14: Help set up one enterprise properly. Farmers who complete setup almost always convert.',
            },
            {
              title: 'Trial Offer',
              body: 'Every farmer who signs up gets 30 days of free Pro. Lead with this — remove the risk, then follow up.',
            },
          ].map((tip, i) => (
            <div key={i}>
              <p className="font-semibold text-gray-800 mb-1">{tip.title}</p>
              <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
        <p className="font-semibold text-amber-800 mb-1">Need help?</p>
        <p className="text-amber-700 text-xs">
          Email us at{' '}
          <a href="mailto:partners@agrimanagerx.com" className="underline font-medium">
            partners@agrimanagerx.com
          </a>{' '}
          or WhatsApp the partner support group for questions, updates, and sharing what works.
        </p>
      </div>
    </div>
  )
}

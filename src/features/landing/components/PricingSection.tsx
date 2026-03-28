import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'
import { trackEvent } from '../../../shared/utils/analytics'

const freeFeatures = [
  '1 enterprise',
  'Daily production tracking',
  'Basic reports',
  'Offline sync',
  '1 user',
]

const proFeatures = [
  'Unlimited enterprises',
  'Team management',
  'Advanced analytics',
  'Labor & payroll module',
  'Priority support',
  'CSV / PDF exports',
]

export function PricingSection() {
  const navigate = useNavigate()
  const [yearly, setYearly] = useState(false)
  const ref = useScrollReveal<HTMLDivElement>()

  const proPrice = yearly ? '$86/year' : '$9/month'
  const proSub = yearly ? 'Save 20% vs monthly' : 'Billed monthly'

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-500 text-lg font-body mb-6">Start free. Upgrade when you're ready.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!yearly ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${yearly ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Yearly <span className="text-emerald-600">–20%</span>
            </button>
          </div>
        </div>

        <div ref={ref} className="reveal grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-1 font-body">Free</h3>
            <p className="text-4xl font-bold text-gray-900 mb-1 kpi-value">$0</p>
            <p className="text-gray-500 text-sm mb-6">Forever</p>
            <ul className="space-y-3 flex-1 mb-8">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'pricing-free' })
                navigate('/auth/signup')
              }}
              className="w-full border-2 border-primary-500 text-primary-700 font-semibold py-3 rounded-xl hover:bg-primary-50 transition-colors"
            >
              Start Free
            </button>
          </div>

          {/* Pro */}
          <div className="bg-primary-600 border-2 border-primary-600 rounded-2xl p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-accent text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full">
              ⭐ Most Popular
            </div>
            <h3 className="text-xl font-bold text-white mb-1 font-body">Pro</h3>
            <p className="text-4xl font-bold text-white mb-1 kpi-value">{proPrice}</p>
            <p className="text-primary-200 text-sm mb-6">{proSub}</p>
            <ul className="space-y-3 flex-1 mb-8">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                  <Check size={16} className="text-accent flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'pricing-pro' })
                navigate('/auth/signup?plan=pro')
              }}
              className="w-full bg-white text-primary-700 font-semibold py-3 rounded-xl hover:bg-primary-50 transition-colors"
            >
              Start Pro Trial
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">No credit card required · Cancel anytime</p>
      </div>
    </section>
  )
}

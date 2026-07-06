import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Globe2, Users } from 'lucide-react'
import { CurrencyProvider } from './context/CurrencyContext'
import { LandingLayout } from './components/LandingLayout'
import { PricingSection } from './components/PricingSection'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { usePageMeta } from '../../shared/hooks/usePageMeta'
import { trackEvent } from '../../shared/utils/analytics'

const principles = [
  {
    icon: CalendarCheck,
    title: 'Predictable',
    desc: 'One clear price. No surprise charges, no per-record fees.',
  },
  {
    icon: Globe2,
    title: 'Priced for your country',
    desc: 'Prices shown in your local currency, scaled to farm economics — not Silicon Valley economics.',
  },
  {
    icon: Users,
    title: 'Everyone included',
    desc: 'Your team gets access on paid plans. Software only works if everyone uses it.',
  },
]

export default function PricingPage() {
  const navigate = useNavigate()
  usePageMeta(
    'Pricing — AgriManagerX',
    'Simple, transparent farm software pricing in your local currency. Start free, upgrade when you are ready.'
  )
  const valueRef = useScrollReveal<HTMLDivElement>()

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-earth-100 via-primary-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-gray-900 leading-tight mb-5">
            Simple pricing. <span className="text-primary-600">Serious value.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-body leading-relaxed">
            Farm software should pay for itself — visibly, in reduced losses and better margins —
            within the first season. Start free, upgrade when you're ready.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-6">
          {principles.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Icon size={22} className="text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 font-body">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Real pricing tiers (geo-currency) */}
      <CurrencyProvider>
        <PricingSection />
      </CurrencyProvider>

      {/* Value explanation */}
      <section className="py-16 bg-gray-50">
        <div ref={valueRef} className="reveal max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl text-gray-900 mb-6">What you're really paying for</h2>
          <p className="text-gray-700 text-lg leading-relaxed font-body mb-8">
            The question isn't what AgriManagerX costs. It's what running blind costs.
          </p>
          <div className="space-y-4 text-left">
            {[
              'One prevented disease outbreak can pay for a year of AgriManagerX.',
              'One avoided harvest breakdown can pay for two.',
              'Knowing your true cost per bird, per egg, or per field changes every pricing and buying decision you make.',
            ].map((line) => (
              <p key={line} className="bg-white border border-gray-100 rounded-xl px-5 py-4 text-gray-700 shadow-sm">
                {line}
              </p>
            ))}
          </div>
          <p className="text-gray-900 font-semibold text-lg mt-8 font-body">
            Farms don't fail from working too little. They fail from seeing too late.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-4">Not sure which plan fits?</h2>
          <p className="text-primary-200 text-lg mb-8 font-body">
            Tell us about your operation and we'll point you to the right plan — or walk you
            through the product live.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'pricing-page-demo' })
                navigate('/demo')
              }}
              className="bg-white text-primary-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary-50 active:scale-[0.98] transition-all shadow-lg"
            >
              Book a Demo
            </button>
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'pricing-page-signup' })
                navigate('/auth/signup')
              }}
              className="border-2 border-white/50 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-all"
            >
              Start Free Instead
            </button>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

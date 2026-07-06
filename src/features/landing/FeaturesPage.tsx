import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { LandingLayout } from './components/LandingLayout'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { trackEvent } from '../../shared/utils/analytics'
import { FEATURE_MODULES, type FeatureModule } from './config/modules'

function ModuleSection({ module, index }: { module: FeatureModule; index: number }) {
  const ref = useScrollReveal<HTMLDivElement>()
  const Icon = module.icon
  const reversed = index % 2 === 1

  return (
    <section id={module.slug} className={`scroll-mt-16 py-16 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`grid lg:grid-cols-2 gap-10 items-center ${reversed ? 'lg:[direction:rtl]' : ''}`}>
          <div className="lg:[direction:ltr]">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-5">
              <Icon size={26} className="text-primary-600" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-gray-900 mb-2">{module.title}</h2>
            <p className="text-primary-700 font-semibold mb-4 font-body">{module.tagline}</p>
            <p className="text-gray-600 leading-relaxed mb-6">{module.description}</p>

            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
              <p className="text-sm font-bold text-primary-800 mb-1 font-body">What it means for you</p>
              <p className="text-gray-700 text-sm leading-relaxed">{module.outcome}</p>
            </div>
          </div>

          <div className="lg:[direction:ltr] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <p className="text-sm font-bold text-gray-900 mb-4 font-body">Key features</p>
            <ul className="space-y-3">
              {module.keyFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function FeaturesPage() {
  const navigate = useNavigate()

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-earth-100 via-primary-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-gray-900 leading-tight mb-5">
            Everything your farm runs on. <span className="text-primary-600">In one system.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-body leading-relaxed">
            AgriManagerX is built as modules that work alone — and work better together.
            Start with what hurts most. Add the rest when you're ready.
          </p>
        </div>
      </section>

      {FEATURE_MODULES.map((m, i) => (
        <ModuleSection key={m.slug} module={m} index={i} />
      ))}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-4">Ready to see it on your farm?</h2>
          <p className="text-primary-200 text-lg mb-8 font-body">
            Start free in minutes, or let us walk you through it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'features-signup' })
                navigate('/auth/signup')
              }}
              className="bg-white text-primary-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary-50 active:scale-[0.98] transition-all shadow-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'features-demo' })
                navigate('/demo')
              }}
              className="border-2 border-white/50 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-all"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

import { useNavigate } from 'react-router-dom'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'
import { trackEvent } from '../../../shared/utils/analytics'

const steps = [
  {
    number: '1',
    title: 'Set Up Your Farm',
    time: '5 min',
    desc: 'Add your enterprises, infrastructure, and workers',
    icon: '🏡',
  },
  {
    number: '2',
    title: 'Record Daily Production',
    time: '2 min/day',
    desc: 'Tap a few fields each morning — livestock, feed, harvest',
    icon: '📋',
  },
  {
    number: '3',
    title: 'See Your Farm Insights',
    time: 'Ongoing',
    desc: 'Reports, charts, and smart alerts in real time',
    icon: '📊',
  },
]

export function HowItWorks() {
  const navigate = useNavigate()
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Up and Running in Minutes
          </h2>
          <p className="text-gray-500 text-lg font-body">Three simple steps to transform your farm management.</p>
        </div>

        <div ref={ref} className="reveal">
          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-0 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px border-t-2 border-dashed border-primary-200 pointer-events-none" />

            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center px-6 mb-8 md:mb-0">
                {/* Step circle */}
                <div className="relative z-10 w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold font-body shadow-lg shadow-primary-200 mb-4">
                  {step.number}
                </div>
                <div className="text-3xl mb-2">{step.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-1 font-body">{step.title}</h3>
                <p className="text-primary-600 text-sm font-semibold mb-2">{step.time}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'how-it-works-cta' })
                navigate('/auth/signup')
              }}
              className="bg-primary-600 text-white font-semibold text-lg px-10 py-4 rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-200"
            >
              Get Started Free →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

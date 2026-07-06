import { LandingLayout } from './components/LandingLayout'
import { ContactSection } from './components/ContactSection'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { usePageMeta } from '../../shared/hooks/usePageMeta'

const steps = [
  {
    title: 'We listen first',
    desc: 'You tell us how your farm runs today and where it hurts.',
  },
  {
    title: 'We show, not tell',
    desc: 'A live walkthrough of AgriManagerX set up for a farm like yours — your enterprises, your workflows.',
  },
  {
    title: 'You ask anything',
    desc: 'Pricing, setup, offline mode, training your team — everything on the table.',
  },
  {
    title: 'You decide',
    desc: "If it fits, we map out your onboarding. If it doesn't, you've lost half an hour and gained some ideas.",
  },
]

export default function DemoPage() {
  const stepsRef = useScrollReveal<HTMLDivElement>()
  usePageMeta(
    'Book a Demo — AgriManagerX',
    'A 30-minute live walkthrough of AgriManagerX set up for a farm like yours. No sales script, no obligation.'
  )

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-earth-100 via-primary-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-gray-900 leading-tight mb-5">
            See AgriManagerX running <span className="text-primary-600">your kind of farm.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-body leading-relaxed">
            Thirty minutes. Your farm's real problems. A live look at exactly how AgriManagerX
            handles them. No slideware, no sales script, no obligation.
          </p>
        </div>
      </section>

      {/* What happens */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-3xl text-gray-900 text-center mb-12">
            What happens in the demo
          </h2>
          <div ref={stepsRef} className="reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 font-body">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking form */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center mb-4">
          <h2 className="font-display text-3xl text-gray-900 mb-4">Book your demo</h2>
          <p className="text-gray-600 font-body leading-relaxed">
            Fill in the form below — it takes under a minute. Tell us your farm name, what you
            farm (livestock, crops, mixed), your farm size, and your biggest operational headache.
            We'll confirm a time within one business day.
          </p>
        </div>
        <ContactSection standalone source="demo" />
      </section>
    </LandingLayout>
  )
}

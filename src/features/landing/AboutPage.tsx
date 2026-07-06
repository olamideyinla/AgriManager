import { useNavigate } from 'react-router-dom'
import { Compass, Eye, HeartHandshake } from 'lucide-react'
import { LandingLayout } from './components/LandingLayout'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { trackEvent } from '../../shared/utils/analytics'

const commitments = [
  {
    title: 'Farmer-first design',
    desc: "If a worker can't learn it in a morning, we rebuild it.",
  },
  {
    title: 'Your data is yours',
    desc: 'Always exportable, never sold, never held hostage.',
  },
  {
    title: 'Built for real conditions',
    desc: 'Offline-first, rugged, and honest about how farms actually work.',
  },
  {
    title: 'Fair pricing',
    desc: 'Priced for farm economics — with a free plan that stays free.',
  },
  {
    title: 'We listen',
    desc: 'Our roadmap is driven by the farmers who use us every day.',
  },
]

export default function AboutPage() {
  const navigate = useNavigate()
  const whyRef = useScrollReveal<HTMLDivElement>()
  const commitRef = useScrollReveal<HTMLDivElement>()

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-earth-100 via-primary-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-display text-4xl sm:text-5xl text-gray-900 leading-tight mb-5">
            We believe well-run farms feed the world.
            <span className="text-primary-600"> So we built the system to run them.</span>
          </h1>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8">
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-8">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-4">
              <Compass size={22} className="text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 font-body">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              To give every growing farm the operational power of a large enterprise — in a tool
              simple enough for every farmhand to use on day one.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-4">
              <Eye size={22} className="text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 font-body">Our Vision</h2>
            <p className="text-gray-700 leading-relaxed">
              A world where no farm fails because of what it couldn't see. Where farmers make
              decisions with the same quality of information as any modern business — and where
              farming is a profession young people fight to get into, not out of.
            </p>
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="py-16 bg-gray-50">
        <div ref={whyRef} className="reveal max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-3xl text-gray-900 text-center mb-8">Why AgriManagerX exists</h2>
          <div className="space-y-5 text-gray-700 leading-relaxed text-lg font-body">
            <p>AgriManagerX was born on real farms, not in a boardroom.</p>
            <p>
              We watched capable, hardworking farmers lose money — not because they farmed badly,
              but because their information failed them. Records in notebooks that got wet.
              Spreadsheets only one person understood. Losses discovered months after they
              happened, when nothing could be done.
            </p>
            <p>
              The software that existed was built for giant industrial operations or hobby farms.
              The farms that feed most of the world — family farms and growing commercial
              operations across Africa, Asia, and Latin America — were left managing a complex
              business with tools from another century.
            </p>
            <p className="font-semibold text-gray-900">We decided that was the problem worth solving.</p>
          </div>
        </div>
      </section>

      {/* Founder credibility */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl text-gray-900 mb-6">Built by people who know farms</h2>
          <p className="text-gray-700 leading-relaxed text-lg font-body mb-8">
            AgriManagerX is built by a team that has walked the pens, the fields, and the machine
            sheds — engineers and operators who have run farm operations and felt these problems
            firsthand. Every feature exists because a real farmer needed it. Nothing is in the
            product because it looked good in a pitch deck.
          </p>
        </div>
      </section>

      {/* Commitments */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-3 mb-10">
            <HeartHandshake size={28} className="text-primary-600" />
            <h2 className="font-display text-3xl text-gray-900 text-center">Our commitment to farmers</h2>
          </div>
          <div ref={commitRef} className="reveal grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {commitments.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-2 font-body">{c.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-8">Come see what we're building.</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'about-signup' })
                navigate('/auth/signup')
              }}
              className="bg-white text-primary-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary-50 active:scale-[0.98] transition-all shadow-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'about-demo' })
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

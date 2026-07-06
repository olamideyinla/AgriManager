import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Check, XCircle } from 'lucide-react'
import { LandingLayout } from './components/LandingLayout'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { usePageMeta } from '../../shared/hooks/usePageMeta'
import { trackEvent } from '../../shared/utils/analytics'
import { getSolution } from './config/solutions'

export default function SolutionPage() {
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const solution = getSolution(slug)
  const workflowsRef = useScrollReveal<HTMLDivElement>()
  const benefitsRef = useScrollReveal<HTMLDivElement>()
  usePageMeta(
    solution ? `${solution.name} — AgriManagerX` : 'Solutions — AgriManagerX',
    solution?.subheadline
  )

  if (!solution) return <Navigate to="/features" replace />

  const goToDemo = (button: string) => {
    trackEvent('CTA Click', { button })
    navigate('/demo')
  }

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-earth-100 via-primary-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-100 text-primary-700 text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
            <span>{solution.emoji}</span>
            <span>{solution.name}</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-gray-900 leading-tight mb-5">
            {solution.headline}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-body leading-relaxed mb-8">
            {solution.subheadline}
          </p>
          <button
            onClick={() => goToDemo(`solution-${solution.slug}-hero`)}
            className="bg-primary-600 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-200"
          >
            {solution.ctaLabel}
          </button>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 font-body">{solution.problemTitle}</h2>
            <ul className="space-y-3">
              {solution.problem.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-800 mb-4 font-body">{solution.solutionTitle}</h2>
            <p className="text-gray-700 leading-relaxed">{solution.solution}</p>
          </div>
        </div>
      </section>

      {/* Workflows */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-3xl text-gray-900 text-center mb-12">Key workflows</h2>
          <div ref={workflowsRef} className="reveal grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {solution.workflows.map((w, i) => (
              <div key={w.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 font-body">{w.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div ref={benefitsRef} className="reveal max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-3xl text-gray-900 text-center mb-10">The benefits</h2>
          <ul className="space-y-4">
            {solution.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 bg-primary-50 border border-primary-100 rounded-xl px-5 py-4">
                <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-8">{solution.closingLine}</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => goToDemo(`solution-${solution.slug}-bottom`)}
              className="bg-white text-primary-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary-50 active:scale-[0.98] transition-all shadow-lg"
            >
              {solution.ctaLabel}
            </button>
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: `solution-${solution.slug}-signup` })
                navigate('/auth/signup')
              }}
              className="border-2 border-white/50 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

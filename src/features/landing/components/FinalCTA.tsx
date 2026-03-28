import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../../../shared/utils/analytics'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

export function FinalCTA() {
  const navigate = useNavigate()
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div ref={ref} className="reveal">
          <h2 className="font-display text-3xl sm:text-5xl mb-4 leading-tight">
            Start Managing Your Farm Today
          </h2>
          <p className="text-primary-200 text-lg mb-10 font-body">
            Join 5,000+ farms already using AgriManagerX
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                trackEvent('CTA Click', { button: 'bottom-cta' })
                navigate('/auth/signup')
              }}
              className="bg-white text-primary-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-primary-50 active:scale-[0.98] transition-all shadow-lg"
            >
              Get Started Free — No Credit Card
            </button>
            <a
              href="#how-it-works"
              className="border-2 border-white/50 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-center"
            >
              Watch a 2-min Demo
            </a>
          </div>

          <p className="mt-6 text-primary-300 text-sm">
            Works offline · Free forever plan · Cancel Pro anytime
          </p>
        </div>
      </div>
    </section>
  )
}

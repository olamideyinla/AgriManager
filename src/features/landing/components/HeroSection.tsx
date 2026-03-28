import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../../../shared/utils/analytics'

export function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen flex items-center pt-16 bg-gradient-to-br from-earth-100 via-primary-50 to-white overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100 rounded-full opacity-30 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-light rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-secondary-700 text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
              <span>🏆</span>
              <span>Rated #1 Farm App in East Africa</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-gray-900 leading-tight mb-6">
              The Farm Management App{' '}
              <span className="text-primary-600">Built for Africa</span> &amp; Beyond
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 font-body leading-relaxed mb-8">
              Track livestock, manage finances, record harvests — all from your phone,
              even without internet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  trackEvent('CTA Click', { button: 'hero-signup' })
                  navigate('/auth/signup')
                }}
                className="bg-primary-600 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-200"
              >
                Get Started Free →
              </button>
              <a
                href="#how-it-works"
                className="border-2 border-primary-300 text-primary-700 font-semibold text-lg px-8 py-4 rounded-xl hover:bg-primary-50 transition-all text-center"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-4 text-sm text-gray-500">No credit card required · Works offline · Free forever plan</p>
          </div>

          {/* App mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-72 sm:w-80">
              {/* Phone frame */}
              <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                <div className="bg-white rounded-[2rem] overflow-hidden" style={{ height: 560 }}>
                  {/* Status bar */}
                  <div className="bg-primary-700 px-5 pt-3 pb-4">
                    <div className="flex justify-between text-white text-xs mb-3 opacity-80">
                      <span>9:41</span>
                      <span>●●●</span>
                    </div>
                    <p className="text-primary-100 text-xs">Good morning, Grace 👋</p>
                    <h3 className="text-white font-bold text-base mt-0.5">Wanjiku Farm</h3>
                  </div>
                  {/* App content preview */}
                  <div className="p-4 space-y-3 bg-gray-50">
                    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Today's Egg Collect</p>
                      <p className="text-2xl font-bold text-primary-700">2,840</p>
                      <p className="text-xs text-emerald-600">↑ 12 vs yesterday</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500">Mortality</p>
                        <p className="text-lg font-bold text-gray-800">3</p>
                        <p className="text-xs text-gray-400">birds today</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500">Feed Used</p>
                        <p className="text-lg font-bold text-gray-800">45kg</p>
                        <p className="text-xs text-gray-400">this morning</p>
                      </div>
                    </div>
                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-3">
                      <p className="text-xs font-semibold text-secondary-700">💰 Month P&amp;L</p>
                      <p className="text-xl font-bold text-primary-700 mt-1">+$412</p>
                      <p className="text-xs text-gray-500">Sales $1,840 · Costs $1,428</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-3 -left-6 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2">
                <span className="text-lg">📶</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Works Offline</p>
                  <p className="text-xs text-gray-500">Syncs when back online</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

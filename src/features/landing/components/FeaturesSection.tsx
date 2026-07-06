import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'
import { FEATURE_MODULES } from '../config/modules'

export function FeaturesSection() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Everything Your Farm Needs
          </h2>
          <p className="text-gray-500 text-lg font-body">Six powerful modules, one simple platform.</p>
        </div>

        <div ref={ref} className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_MODULES.map(({ slug, icon: Icon, title, tagline }) => (
            <Link
              key={slug}
              to={`/features#${slug}`}
              className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all block"
            >
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 font-body">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{tagline}</p>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/features"
            className="inline-flex items-center gap-2 text-primary-700 font-semibold hover:text-primary-800 transition-colors"
          >
            Explore all features <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}

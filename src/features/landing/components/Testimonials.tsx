import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const testimonials = [
  {
    quote:
      'Finally I can see which flock makes me the most profit. Last month I saved $200 just from spotting a feed waste issue early.',
    name: 'Grace Wanjiku',
    role: 'Layers Farmer · Kiambu, Kenya',
    flag: '🇰🇪',
  },
  {
    quote:
      'The offline mode is everything. My farm has poor internet but I never miss a day of records now.',
    name: 'Emmanuel Okafor',
    role: 'Broiler Farmer · Lagos, Nigeria',
    flag: '🇳🇬',
  },
  {
    quote:
      'I used to spend Sunday afternoons doing payroll calculations. Now it takes 5 minutes and I\'m confident the numbers are right.',
    name: 'Priya Sharma',
    role: 'Mixed Farm · Punjab, India',
    flag: '🇮🇳',
  },
]

function StarRating() {
  return (
    <div className="flex gap-0.5 text-accent text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  )
}

export function Testimonials() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Farmers Love AgriManagerX
          </h2>
          <p className="text-gray-500 text-lg font-body">Real stories from real farms across Africa</p>
        </div>

        <div
          ref={ref}
          className="reveal grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col reveal-delay-${i + 1}`}
            >
              <div className="text-6xl font-display text-accent opacity-20 leading-none mb-2 select-none">"</div>
              <p className="text-gray-700 leading-relaxed flex-1 -mt-2">{t.quote}</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <StarRating />
                <p className="font-semibold text-gray-900 mt-2">
                  {t.flag} {t.name}
                </p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

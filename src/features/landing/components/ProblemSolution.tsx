import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const problems = [
  'Records get lost or damaged',
  'No way to track profit per flock',
  "Can't spot disease early enough",
  'Payroll errors cost you money',
]

const solutions = [
  'All records in one place, backed up automatically',
  'Real-time P&L per enterprise',
  'Smart alerts for unusual mortality or health events',
  'Payroll calculated automatically from attendance',
]

export function ProblemSolution() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div ref={ref} className="reveal grid md:grid-cols-2 gap-8">
          {/* Problem */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
            <div className="text-3xl mb-3">📓</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 font-body">Still Using Notebooks?</h3>
            <ul className="space-y-3">
              {problems.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="text-red-500 text-lg leading-5 mt-0.5 flex-shrink-0">❌</span>
                  <span className="text-gray-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-8">
            <div className="text-3xl mb-3">🌾</div>
            <h3 className="text-xl font-bold text-primary-800 mb-4 font-body">Meet AgriManagerX</h3>
            <ul className="space-y-3">
              {solutions.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="text-emerald-500 text-lg leading-5 mt-0.5 flex-shrink-0">✅</span>
                  <span className="text-gray-700">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

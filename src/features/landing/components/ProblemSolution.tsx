import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const problems = [
  'Records scattered across notebooks, spreadsheets, and memory',
  "Losses you can't see until the end of the season",
  'Feed ordered late, vaccinations missed, services overdue',
  'Decisions made blind because the numbers arrive too late',
  "Growth that stalls because you can't measure what's working",
]

const solutions = [
  'Record once, see it everywhere — backed up automatically',
  'Alerts before problems become losses',
  'Daily records turned into weekly insight, per enterprise',
  'Clear tasks for your team instead of verbal instructions',
  'Real numbers for the bank, the buyer, and your next season',
]

export function ProblemSolution() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Your farm is running you. It should be the other way around.
          </h2>
          <p className="text-gray-500 text-lg font-body">
            Growing farms are too big for paper and too complex for spreadsheets. Hard work
            without visibility means losses nobody sees coming.
          </p>
        </div>

        <div ref={ref} className="reveal grid md:grid-cols-2 gap-8">
          {/* Problem */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
            <div className="text-3xl mb-3">📓</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 font-body">Sound familiar?</h3>
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
            <h3 className="text-xl font-bold text-primary-800 mb-4 font-body">
              AgriManagerX: one operating system for the whole farm
            </h3>
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

        <p className="text-center text-gray-600 font-body mt-10 max-w-2xl mx-auto">
          Not another app for one corner of the farm — a single system connecting your animals,
          your fields, your stores, and your people. Simple enough for every worker. Powerful
          enough for the owner.
        </p>
      </div>
    </section>
  )
}

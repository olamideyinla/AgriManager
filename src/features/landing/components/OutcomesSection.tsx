import { ShieldCheck, PiggyBank, Users2, Sprout, Landmark } from 'lucide-react'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const outcomes = [
  {
    icon: ShieldCheck,
    title: 'Lower losses',
    desc: 'Catch mortality spikes, feed waste, and missed treatments early.',
  },
  {
    icon: PiggyBank,
    title: 'Better margins',
    desc: "See cost per unit and cut what isn't working.",
  },
  {
    icon: Users2,
    title: 'A team that runs itself',
    desc: 'Clear tasks, clear records, less chasing.',
  },
  {
    icon: Sprout,
    title: 'Confidence to grow',
    desc: 'Expand knowing your operation can handle it.',
  },
  {
    icon: Landmark,
    title: "A farm that's bankable",
    desc: 'Clean records that lenders, buyers, and partners trust.',
  },
]

export function OutcomesSection() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Farms on AgriManagerX don't just keep records. They get results.
          </h2>
          <p className="text-gray-500 text-lg font-body">
            This is what it feels like when the farm finally works as one system.
          </p>
        </div>

        <div ref={ref} className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {outcomes.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Icon size={22} className="text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 font-body text-sm">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

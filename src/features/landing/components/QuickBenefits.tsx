import { Eye, TrendingDown, WifiOff } from 'lucide-react'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const benefits = [
  {
    icon: Eye,
    title: 'See everything, instantly',
    desc: 'Every animal, field, and bag of feed — tracked in real time, visible in one dashboard.',
  },
  {
    icon: TrendingDown,
    title: 'Stop losing money to guesswork',
    desc: 'Know your true cost per animal, per field, per season. Decide with numbers, not gut feeling.',
  },
  {
    icon: WifiOff,
    title: 'Works where you work',
    desc: "Full offline mode. Record in the barn or the back field — it syncs when you're back in signal.",
  },
]

export function QuickBenefits() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-16 bg-white">
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-6">
        {benefits.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="text-center px-4">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <Icon size={24} className="text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 font-body">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

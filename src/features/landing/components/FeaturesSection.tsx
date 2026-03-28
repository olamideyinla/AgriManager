import { ClipboardList, TrendingUp, Package, Bell, Users, WifiOff } from 'lucide-react'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const features = [
  {
    icon: ClipboardList,
    title: 'Daily Production Tracking',
    desc: 'Layers, broilers, cattle, fish, crops — record in 30 seconds',
  },
  {
    icon: TrendingUp,
    title: 'Financial Ledger',
    desc: 'Sales, expenses, and P&L per enterprise automatically',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    desc: 'Feed & medicine stock with low-stock alerts before you run out',
  },
  {
    icon: Bell,
    title: 'Smart Health Alerts',
    desc: 'Mortality spikes, health events, and vaccination reminders',
  },
  {
    icon: Users,
    title: 'Labor & Payroll',
    desc: 'Worker attendance, casual labor costs, payroll with one tap',
  },
  {
    icon: WifiOff,
    title: 'Works Offline',
    desc: 'Full functionality without internet. Syncs when back online',
  },
]

export function FeaturesSection() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Everything Your Farm Needs
          </h2>
          <p className="text-gray-500 text-lg font-body">Six powerful modules, one simple app.</p>
        </div>

        <div ref={ref} className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 font-body">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

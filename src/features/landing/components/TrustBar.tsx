import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const stats = [
  { value: '5,000+', label: 'Farms' },
  { value: '12', label: 'Countries' },
  { value: '2M+', label: 'Records Logged' },
  { value: '98%', label: 'Offline Reliable' },
]

export function TrustBar() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="bg-primary-700 text-white py-10">
      <div ref={ref} className="reveal max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-primary-600">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center px-6">
              <p className="text-3xl sm:text-4xl font-bold font-body kpi-value">{stat.value}</p>
              <p className="text-primary-200 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

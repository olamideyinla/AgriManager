import { CostBreakdownPie } from '../../../shared/components/charts/CostBreakdownPie'
import type { LayerDailyRecord } from '../../../shared/types'

interface Props { records: LayerDailyRecord[] }

export function EggGradingSection({ records }: Props) {
  const totalA = records.reduce((s, r) => s + (r.eggGradeA ?? 0), 0)
  const totalB = records.reduce((s, r) => s + (r.eggGradeB ?? 0), 0)
  const totalC = records.reduce((s, r) => s + (r.eggGradeC ?? 0), 0)
  const totalGraded = totalA + totalB + totalC
  const totalEggs   = records.reduce((s, r) => s + r.totalEggs, 0)
  const pctGraded   = totalEggs > 0 ? Math.round((totalGraded / totalEggs) * 100) : 0

  if (totalGraded === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">Egg Grading</p>
        <p className="text-xs text-gray-400">
          No grading data yet — record Grade A/B/C counts in daily entries to see this breakdown.
        </p>
      </div>
    )
  }

  const pieData = [
    { name: 'Grade A', value: totalA, color: '#10b981' },
    { name: 'Grade B', value: totalB, color: '#f59e0b' },
    { name: 'Grade C', value: totalC, color: '#ef4444' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-gray-700">Egg Grading</p>
        <span className="text-xs text-gray-400">{pctGraded}% of eggs graded</span>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-emerald-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-500">Grade A</p>
          <p className="text-sm font-bold text-emerald-700">{totalA.toLocaleString()}</p>
        </div>
        <div className="flex-1 bg-amber-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-500">Grade B</p>
          <p className="text-sm font-bold text-amber-700">{totalB.toLocaleString()}</p>
        </div>
        <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
          <p className="text-xs text-gray-500">Grade C</p>
          <p className="text-sm font-bold text-red-700">{totalC.toLocaleString()}</p>
        </div>
      </div>

      <CostBreakdownPie
        data={pieData}
        height={180}
        emptyText="No grading data"
      />
    </div>
  )
}

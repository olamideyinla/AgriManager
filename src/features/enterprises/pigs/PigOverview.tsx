import { usePigMetrics } from '../hooks/use-pig-metrics'
import { KPICard } from '../../../shared/components/charts/KPICard'
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart'
import { FeatureGate } from '../../../shared/components/FeatureGate'
import { useUnitEconomics } from '../../../core/database/hooks/use-unit-economics'
import type { EnterpriseInstance } from '../../../shared/types'

interface Props { enterprise: EnterpriseInstance }

export function PigOverview({ enterprise }: Props) {
  const metrics = usePigMetrics(enterprise)
  const econ    = useUnitEconomics(enterprise.id, enterprise)

  if (metrics === undefined) {
    return <div className="p-4 text-sm text-gray-400">Loading…</div>
  }

  const mortVariant = metrics.mortalityRate < 3 ? 'good' : metrics.mortalityRate < 8 ? 'warning' : 'danger'
  const fcrVariant  = metrics.fcr == null ? 'default' : metrics.fcr < 2.5 ? 'good' : metrics.fcr < 3.5 ? 'warning' : 'danger'

  return (
    <div className="space-y-4 p-4">
      {/* KPI row */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Metrics</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <KPICard
            label="Day of Batch"
            value={String(metrics.daysInBatch)}
            subValue="days"
            variant="default"
          />
          <KPICard
            label="Mortality"
            value={`${metrics.mortalityRate}%`}
            subValue={`${metrics.totalMortality} deaths`}
            variant={mortVariant}
          />
          <KPICard
            label="Births"
            value={String(metrics.totalBirths)}
            subValue="piglets farrowed"
            variant={metrics.totalBirths > 0 ? 'good' : 'default'}
          />
          <KPICard
            label="Weans"
            value={String(metrics.totalWeans)}
            subValue="piglets weaned"
            variant={metrics.totalWeans > 0 ? 'good' : 'default'}
          />
          <KPICard
            label="FCR"
            value={metrics.fcr != null ? String(metrics.fcr) : '—'}
            subValue="feed:gain"
            variant={fcrVariant}
          />
          <KPICard
            label="Avg Weight"
            value={metrics.latestAvgWeightKg != null ? `${metrics.latestAvgWeightKg} kg` : '—'}
            subValue="latest sample"
            variant={metrics.latestAvgWeightKg != null ? 'good' : 'default'}
          />
        </div>
      </div>

      {/* Cost Intelligence */}
      <FeatureGate feature="unit_economics">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cost Intelligence</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <KPICard label="Cost / animal" value={econ.costPerBird != null ? `$${econ.costPerBird.toFixed(2)}` : '—'} subValue="per head placed" variant="default" />
            <KPICard label="Feed cost %" value={`${econ.feedCostPct.toFixed(1)}%`} subValue="of expenses" variant={econ.feedCostPct > 65 ? 'warning' : 'default'} />
            <KPICard label="Total feed" value={`${metrics.totalFeedKg} kg`} subValue={`${metrics.avgFeedPerDayKg} kg/day`} variant="default" />
          </div>
        </div>
      </FeatureGate>

      {/* Weight growth trend */}
      {metrics.weightData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Weight Samples</p>
          <TrendLineChart
            data={metrics.weightData}
            label="Avg Weight"
            unit=" kg"
            color="#2D6A4F"
            height={150}
            emptyText="Add weight samples in daily entries"
          />
        </div>
      )}

      {/* Daily feed trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Daily Feed (last 30 days)</p>
        <TrendLineChart
          data={metrics.dailyFeed}
          label="Feed"
          unit=" kg"
          color="#8B6914"
          height={130}
          emptyText="No feed data yet"
        />
      </div>
    </div>
  )
}

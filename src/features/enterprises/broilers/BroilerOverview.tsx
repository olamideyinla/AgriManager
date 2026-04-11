import { useBroilerMetrics } from '../hooks/use-broiler-metrics'
import { KPICard } from '../../../shared/components/charts/KPICard'
import { GrowthCurveChart } from '../../../shared/components/charts/GrowthCurveChart'
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart'
import { FeatureGate } from '../../../shared/components/FeatureGate'
import { useUnitEconomics } from '../../../core/database/hooks/use-unit-economics'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import type { EnterpriseInstance } from '../../../shared/types'

interface Props { enterprise: EnterpriseInstance }

export function BroilerOverview({ enterprise }: Props) {
  const metrics = useBroilerMetrics(
    enterprise.id,
    enterprise.startDate,
    enterprise.currentStockCount,
    enterprise.initialStockCount,
  )
  const econ = useUnitEconomics(enterprise.id, enterprise)
  const { symbol } = useCurrency()

  if (metrics === undefined) {
    return <div className="p-4 text-sm text-gray-400">Loading…</div>
  }

  const mortVariant = metrics.mortalityPct < 2 ? 'good' : metrics.mortalityPct < 5 ? 'warning' : 'danger'
  const fcrVariant  = metrics.fcr === 0 ? 'default' : metrics.fcr < 1.8 ? 'good' : metrics.fcr < 2.2 ? 'warning' : 'danger'

  return (
    <div className="space-y-4 p-4">
      {/* KPI row */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Metrics</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <KPICard
            label="Day of Cycle"
            value={String(metrics.dayOfCycle)}
            subValue="days old"
            variant="default"
          />
          <KPICard
            label="Avg Weight"
            value={metrics.latestWeightKg != null ? `${metrics.latestWeightKg} kg` : '—'}
            subValue="latest sample"
            variant={metrics.latestWeightKg != null ? 'good' : 'default'}
          />
          <KPICard
            label="FCR"
            value={metrics.fcr > 0 ? String(metrics.fcr) : '—'}
            subValue="feed:gain"
            variant={fcrVariant}
          />
          <KPICard
            label="Mortality"
            value={`${metrics.mortalityPct}%`}
            subValue={`Survival ${metrics.survivalPct}%`}
            variant={mortVariant}
          />
          <KPICard
            label="EPEF"
            value={metrics.epef > 0 ? String(metrics.epef) : '—'}
            subValue="efficiency"
            variant={metrics.epef >= 300 ? 'good' : metrics.epef >= 200 ? 'warning' : 'default'}
          />
        </div>
      </div>

      {/* Cost Intelligence */}
      <FeatureGate feature="unit_economics">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cost Intelligence</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <KPICard label="Cost / bird"  value={econ.costPerBird != null ? `${symbol}${econ.costPerBird.toFixed(2)}` : '—'} subValue="per bird placed" variant="default" />
            <KPICard label="Cost / kg"    value={econ.costPerKgMeat != null ? `${symbol}${econ.costPerKgMeat.toFixed(2)}` : '—'} subValue="live weight" variant="default" />
            <KPICard label="Feed cost %"  value={`${econ.feedCostPct.toFixed(1)}%`} subValue="of expenses" variant={econ.feedCostPct > 70 ? 'warning' : 'default'} />
          </div>
        </div>
      </FeatureGate>

      {/* Growth curve */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Growth Curve vs Ross 308</p>
        <GrowthCurveChart
          data={metrics.growthData}
          height={200}
          emptyText="Add weight samples in daily entries to see growth curve"
        />
      </div>

      {/* Daily mortality */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Daily Mortality (last 30 days)</p>
        <TrendLineChart
          data={metrics.dailyMortality}
          label="Deaths"
          color="#ef4444"
          height={130}
          showGrid
          emptyText="No mortality data recorded yet"
        />
      </div>
    </div>
  )
}

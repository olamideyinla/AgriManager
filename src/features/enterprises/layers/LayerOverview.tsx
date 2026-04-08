import { useLayerMetrics } from '../hooks/use-layer-metrics'
import { KPICard } from '../../../shared/components/charts/KPICard'
import { ProductionCurveChart } from '../../../shared/components/charts/ProductionCurveChart'
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart'
import { FeatureGate } from '../../../shared/components/FeatureGate'
import { useUnitEconomics } from '../../../core/database/hooks/use-unit-economics'
import type { EnterpriseInstance } from '../../../shared/types'

interface Props { enterprise: EnterpriseInstance }

export function LayerOverview({ enterprise }: Props) {
  const metrics = useLayerMetrics(
    enterprise.id,
    enterprise.startDate,
    enterprise.currentStockCount,
    enterprise.initialStockCount,
  )
  const econ = useUnitEconomics(enterprise.id, enterprise)

  if (metrics === undefined) {
    return <div className="p-4 text-sm text-gray-400">Loading…</div>
  }

  function fmtCents(v: number | undefined, decimals = 2): string {
    if (v == null) return '—'
    return v.toFixed(decimals)
  }

  const hdpVariant = metrics.currentHdpPct >= 75 ? 'good' : metrics.currentHdpPct >= 55 ? 'warning' : 'danger'
  const mortVariant = metrics.cumulativeMortPct < 2 ? 'good' : metrics.cumulativeMortPct < 5 ? 'warning' : 'danger'
  const currentWeek = Math.ceil(metrics.dayOfCycle / 7)

  return (
    <div className="space-y-4 p-4">
      {/* KPI row */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Metrics</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <KPICard
            label="Production"
            value={`${metrics.currentHdpPct}%`}
            subValue="Hen-day"
            trend={metrics.hdpTrend7d}
            trendLabel={metrics.hdpTrend7d != null ? `${metrics.hdpTrend7d > 0 ? '+' : ''}${metrics.hdpTrend7d}pts` : undefined}
            variant={hdpVariant}
          />
          <KPICard
            label="Cumulative Mort."
            value={`${metrics.cumulativeMortPct}%`}
            subValue={`${metrics.totalEggs.toLocaleString()} total eggs`}
            variant={mortVariant}
          />
          <KPICard
            label="Total Feed"
            value={`${metrics.totalFeedKg} kg`}
            subValue={`Day ${metrics.dayOfCycle}`}
            variant="default"
          />
          <KPICard
            label="Flock Size"
            value={enterprise.currentStockCount.toLocaleString()}
            subValue={`of ${enterprise.initialStockCount.toLocaleString()}`}
            variant="default"
          />
        </div>
      </div>

      {/* Cost Intelligence */}
      <FeatureGate feature="unit_economics">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cost Intelligence</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <KPICard label="Cost / egg"  value={econ.costPerEgg != null ? `¢${(econ.costPerEgg * 100).toFixed(1)}` : '—'} subValue="per egg" variant="default" />
            <KPICard label="Cost / tray" value={econ.costPerTray != null ? `$${fmtCents(econ.costPerTray)}` : '—'} subValue="30 eggs" variant="default" />
            <KPICard label="Break-even"  value={econ.breakEvenEggPrice != null ? `¢${(econ.breakEvenEggPrice * 100).toFixed(1)}` : '—'} subValue="per egg" variant="default" />
            <KPICard label="Feed cost %"  value={`${econ.feedCostPct.toFixed(1)}%`} subValue="of expenses" variant={econ.feedCostPct > 70 ? 'warning' : 'default'} />
          </div>
        </div>
      </FeatureGate>

      {/* Production curve */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Production Curve vs Standard</p>
        <ProductionCurveChart
          data={metrics.weeklyProduction}
          currentWeek={currentWeek}
          height={200}
        />
      </div>

      {/* Weekly mortality */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Weekly Mortality</p>
        <TrendLineChart
          data={metrics.weeklyMortality}
          label="Deaths"
          color="#ef4444"
          height={140}
          showGrid
          emptyText="No mortality data yet"
        />
      </div>

      {/* Feed trend */}
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

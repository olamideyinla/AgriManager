import { useLiveQuery } from 'dexie-react-hooks'
import { KPICard } from '../../../shared/components/charts/KPICard'
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart'
import { FeatureGate } from '../../../shared/components/FeatureGate'
import { useUnitEconomics } from '../../../core/database/hooks/use-unit-economics'
import { db } from '../../../core/database/db'
import type { EnterpriseInstance } from '../../../shared/types'

interface Props { enterprise: EnterpriseInstance }

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000))
}

export function CustomAnimalOverview({ enterprise }: Props) {
  const econ    = useUnitEconomics(enterprise.id, enterprise)

  const records = useLiveQuery(
    () => db.customAnimalDailyRecords
      .where('enterpriseInstanceId')
      .equals(enterprise.id)
      .sortBy('date'),
    [enterprise.id],
  )

  if (records === undefined) {
    return <div className="p-4 text-sm text-gray-400">Loading…</div>
  }

  const daysInBatch = daysSince(enterprise.startDate)
  const totalMort   = records.reduce((s, r) => s + (r.mortalityCount ?? 0), 0)
  const mortRate    = Math.round((totalMort / Math.max(enterprise.initialStockCount, 1)) * 1000) / 10
  const totalFeedKg = records.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0)
  const avgFeedPerDay = daysInBatch > 0 ? Math.round((totalFeedKg / daysInBatch) * 10) / 10 : 0

  // Metric names from the most recent record that has them set
  const latest = [...records].reverse()
  const metric1Name = latest.find(r => r.metric1Name)?.metric1Name
  const metric2Name = latest.find(r => r.metric2Name)?.metric2Name
  const metric3Name = latest.find(r => r.metric3Name)?.metric3Name

  const metric1Latest = latest.find(r => r.metric1Value != null)?.metric1Value ?? null
  const metric2Latest = latest.find(r => r.metric2Value != null)?.metric2Value ?? null
  const metric3Latest = latest.find(r => r.metric3Value != null)?.metric3Value ?? null

  const mortVariant = mortRate < 5 ? 'good' : mortRate < 10 ? 'warning' : 'danger'

  // Chart data for named metrics
  const metric1Data = records
    .filter(r => r.metric1Value != null)
    .map(r => ({ date: r.date.slice(5), value: r.metric1Value! }))
  const metric2Data = records
    .filter(r => r.metric2Value != null)
    .map(r => ({ date: r.date.slice(5), value: r.metric2Value! }))
  const metric3Data = records
    .filter(r => r.metric3Value != null)
    .map(r => ({ date: r.date.slice(5), value: r.metric3Value! }))

  const dailyFeed = records.slice(-30).map(r => ({ date: r.date.slice(5), value: r.feedConsumedKg ?? 0 }))

  return (
    <div className="space-y-4 p-4">
      {/* KPI row */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Metrics</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <KPICard
            label="Day of Batch"
            value={String(daysInBatch)}
            subValue="days"
            variant="default"
          />
          <KPICard
            label="Mortality"
            value={`${mortRate}%`}
            subValue={`${totalMort} deaths`}
            variant={mortVariant}
          />
          <KPICard
            label="Feed / day"
            value={`${avgFeedPerDay} kg`}
            subValue={`${totalFeedKg} kg total`}
            variant="default"
          />
          {metric1Name != null && (
            <KPICard
              label={metric1Name}
              value={metric1Latest != null ? String(metric1Latest) : '—'}
              subValue="latest"
              variant="default"
            />
          )}
          {metric2Name != null && (
            <KPICard
              label={metric2Name}
              value={metric2Latest != null ? String(metric2Latest) : '—'}
              subValue="latest"
              variant="default"
            />
          )}
          {metric3Name != null && (
            <KPICard
              label={metric3Name}
              value={metric3Latest != null ? String(metric3Latest) : '—'}
              subValue="latest"
              variant="default"
            />
          )}
        </div>
      </div>

      {/* Cost Intelligence */}
      <FeatureGate feature="unit_economics">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cost Intelligence</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <KPICard label="Cost / animal" value={econ.costPerBird != null ? `$${econ.costPerBird.toFixed(2)}` : '—'} subValue="per head placed" variant="default" />
            <KPICard label="Feed cost %" value={`${econ.feedCostPct.toFixed(1)}%`} subValue="of expenses" variant={econ.feedCostPct > 65 ? 'warning' : 'default'} />
          </div>
        </div>
      </FeatureGate>

      {/* Named metric trend charts */}
      {metric1Name && metric1Data.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{metric1Name} Trend</p>
          <TrendLineChart
            data={metric1Data}
            label={metric1Name}
            color="#2D6A4F"
            height={130}
            emptyText={`No ${metric1Name} data yet`}
          />
        </div>
      )}
      {metric2Name && metric2Data.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{metric2Name} Trend</p>
          <TrendLineChart
            data={metric2Data}
            label={metric2Name}
            color="#DAA520"
            height={130}
            emptyText={`No ${metric2Name} data yet`}
          />
        </div>
      )}
      {metric3Name && metric3Data.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{metric3Name} Trend</p>
          <TrendLineChart
            data={metric3Data}
            label={metric3Name}
            color="#8B6914"
            height={130}
            emptyText={`No ${metric3Name} data yet`}
          />
        </div>
      )}

      {/* Daily feed */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Daily Feed (last 30 days)</p>
        <TrendLineChart
          data={dailyFeed}
          label="Feed"
          unit=" kg"
          color="#6b7280"
          height={130}
          emptyText="No feed data yet"
        />
      </div>
    </div>
  )
}

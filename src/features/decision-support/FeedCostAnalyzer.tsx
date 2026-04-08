import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { CostBreakdownPie } from '../../shared/components/charts/CostBreakdownPie'
import { TrendLineChart } from '../../shared/components/charts/TrendLineChart'
import { db } from '../../core/database/db'
import type { EnterpriseInstance } from '../../shared/types'

// ── Typical feed cost benchmarks by enterprise type ─────────────────────���──

const FEED_COST_BENCHMARKS: Partial<Record<string, number>> = {
  layers:        65,  // 60–70% of expenses
  broilers:      68,  // 65–70%
  cattle_dairy:  50,  // 45–55%
  cattle_beef:   55,
  fish:          55,
  pigs_breeding: 60,
  pigs_growfinish: 65,
  rabbit:        60,
  crop_annual:   25,  // lower — feed not main cost for crops
  crop_perennial:20,
  custom_animal: 60,
}

// ── Data loading ──────────────────────────────────────────────────────────────

function useActiveEnterprises() {
  const appUser = useAuthStore(s => s.appUser)
  return useLiveQuery(async () => {
    if (!appUser) return []
    const locs   = await db.farmLocations.where('organizationId').equals(appUser.organizationId).toArray()
    const infras = await db.infrastructures.where('farmLocationId').anyOf(locs.map(l => l.id)).toArray()
    return db.enterpriseInstances
      .where('infrastructureId').anyOf(infras.map(i => i.id))
      .filter(e => e.status === 'active')
      .toArray()
  }, [appUser?.organizationId]) ?? []
}

interface WeeklyFeedCost {
  week: string
  feedCost: number
  totalCost: number
  pct: number
}

function useFeedCostTrend(enterprise: EnterpriseInstance | undefined): WeeklyFeedCost[] {
  return useLiveQuery(async () => {
    if (!enterprise) return []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const txns = await db.financialTransactions
      .where('enterpriseInstanceId').equals(enterprise.id)
      .filter(t => t.type === 'expense' && t.date >= thirtyDaysAgo)
      .toArray()

    // Group by week
    const weeks = new Map<string, { feed: number; total: number }>()
    for (const t of txns) {
      const d    = new Date(t.date)
      const mon  = new Date(d)
      mon.setDate(d.getDate() - d.getDay() + 1)  // Monday of that week
      const key  = mon.toISOString().split('T')[0]
      const wk   = weeks.get(key) ?? { feed: 0, total: 0 }
      wk.total  += t.amount
      if (t.category === 'feed') wk.feed += t.amount
      weeks.set(key, wk)
    }

    return Array.from(weeks.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({
        week: week.slice(5),  // MM-DD
        feedCost: v.feed,
        totalCost: v.total,
        pct: v.total > 0 ? Math.round((v.feed / v.total) * 100) : 0,
      }))
  }, [enterprise?.id]) ?? []
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 pt-safe-top">
      <div className="flex items-center gap-3 py-3">
        <button onClick={onBack} className="touch-target -ml-2">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Feed Cost Analyzer</h1>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeedCostAnalyzer() {
  const navigate    = useNavigate()
  const enterprises = useActiveEnterprises()
  const { fmt }     = useCurrency()

  const [selectedIdx, setSelectedIdx] = useState(0)
  const enterprise = enterprises?.[selectedIdx] as EnterpriseInstance | undefined

  const weeklyTrend = useFeedCostTrend(enterprise)

  const allTransactions = useLiveQuery(
    async () => {
      if (!enterprise) return []
      return db.financialTransactions
        .where('enterpriseInstanceId').equals(enterprise.id)
        .filter(t => t.type === 'expense')
        .toArray()
    },
    [enterprise?.id],
  ) ?? []

  const { totalExpenses, feedCostTotal, feedCostPct, pieData } = useMemo(() => {
    const totalExpenses  = allTransactions.reduce((s, t) => s + t.amount, 0)
    const feedCostTotal  = allTransactions.filter(t => t.category === 'feed').reduce((s, t) => s + t.amount, 0)
    const feedCostPct    = totalExpenses > 0 ? (feedCostTotal / totalExpenses) * 100 : 0

    // Pie data by category
    const catMap = new Map<string, number>()
    for (const t of allTransactions) {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount)
    }
    const pieData = Array.from(catMap.entries()).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: Math.round(value * 100) / 100,
      color: name === 'feed' ? '#2D6A4F' : name === 'labor' ? '#52b788' : name === 'medication' ? '#DAA520' : '#9ca3af',
    }))

    return { totalExpenses, feedCostTotal, feedCostPct, pieData }
  }, [allTransactions])

  const benchmark   = FEED_COST_BENCHMARKS[enterprise?.enterpriseType ?? ''] ?? 60
  const aboveBenchmark = feedCostPct > benchmark + 5
  const belowBenchmark = feedCostPct < benchmark - 10

  const trendChartData = weeklyTrend.map(w => ({ date: w.week, value: w.pct }))
  const benchmarkLine  = weeklyTrend.map(w => ({ date: w.week, value: benchmark }))

  if (enterprises === undefined) {
    return <div className="flex h-dvh items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

  if (enterprises.length === 0) {
    return (
      <div className="min-h-dvh bg-gray-50">
        <Header onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-4xl mb-3">🌾</p>
          <p className="text-gray-500 text-sm">No active enterprises found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <Header onBack={() => navigate(-1)} />

      <div className="px-4 py-4 space-y-4">
        {/* Enterprise selector */}
        {enterprises.length > 1 && (
          <div className="card p-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select enterprise</label>
            <select
              value={selectedIdx}
              onChange={e => setSelectedIdx(+e.target.value)}
              className="input text-sm"
            >
              {enterprises.map((e, i) => (
                <option key={e.id} value={i}>{e.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Feed Cost',  value: fmt(feedCostTotal), sub: 'total' },
            { label: 'Feed %',     value: `${feedCostPct.toFixed(1)}%`, sub: 'of expenses' },
            { label: 'Benchmark',  value: `${benchmark}%`, sub: 'typical' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              <p className="text-[10px] text-gray-300">{sub}</p>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        {totalExpenses > 0 && (
          <div className={`rounded-2xl p-4 flex items-start gap-3 ${
            aboveBenchmark ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
          }`}>
            {aboveBenchmark
              ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              : <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-semibold ${aboveBenchmark ? 'text-amber-800' : 'text-emerald-800'}`}>
                {aboveBenchmark
                  ? `Feed cost is ${(feedCostPct - benchmark).toFixed(1)}% above typical`
                  : belowBenchmark
                    ? `Feed cost is unusually low — check records`
                    : 'Feed cost is within normal range'
                }
              </p>
              {aboveBenchmark && (
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Consider: bulk purchasing, comparing feed suppliers, reviewing feed type or formulation, or checking for waste.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Weekly trend */}
        {weeklyTrend.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Feed Cost % per Week (last 30 days)</p>
            <TrendLineChart
              data={trendChartData}
              label="Feed %"
              unit="%"
              color="#2D6A4F"
              height={150}
              showGrid
              emptyText="No data in last 30 days"
            />
            {benchmarkLine.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Benchmark: {benchmark}% for this enterprise type
              </p>
            )}
          </div>
        )}

        {/* Cost breakdown pie */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Expense Breakdown</p>
            <CostBreakdownPie data={pieData} height={200} />
          </div>
        )}

        {/* Weekly table */}
        {weeklyTrend.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Weekly Detail</p>
            <div className="space-y-2">
              {weeklyTrend.map(w => (
                <div key={w.week} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">Week of {w.week}</span>
                  <span className="text-gray-700">{fmt(w.feedCost)} feed</span>
                  <span className={`font-semibold ${w.pct > benchmark + 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {w.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalExpenses === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-gray-500">No expense data yet</p>
            <p className="text-xs text-gray-400 mt-1">Log financial transactions to see feed cost analysis</p>
          </div>
        )}
      </div>
    </div>
  )
}

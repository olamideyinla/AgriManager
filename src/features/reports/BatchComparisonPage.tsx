import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import type { BatchCloseout, EnterpriseInstance } from '../../shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CloseoutWithEnterprise extends BatchCloseout {
  enterpriseName: string
  enterpriseType: string
}

type SortKey = 'date' | 'fcr' | 'mortality' | 'netProfit' | 'totalDays'
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SORT_LABELS: Record<SortKey, string> = {
  date:       'Date',
  fcr:        'FCR',
  mortality:  'Mortality %',
  netProfit:  'Net Profit',
  totalDays:  'Days',
}

function sortValue(c: CloseoutWithEnterprise, key: SortKey): number {
  switch (key) {
    case 'date':      return new Date(c.closeoutDate).getTime()
    case 'fcr':       return c.avgFCR ?? 999
    case 'mortality': return c.mortalityRate
    case 'netProfit': return c.netProfitCents
    case 'totalDays': return c.totalDays
  }
}

function fcrColor(fcr?: number | null): string {
  if (fcr == null) return 'text-gray-400'
  if (fcr <= 1.8)  return 'text-emerald-600'
  if (fcr <= 2.2)  return 'text-amber-600'
  return 'text-red-600'
}

function mortColor(pct: number): string {
  if (pct <= 3)  return 'text-emerald-600'
  if (pct <= 6)  return 'text-amber-600'
  return 'text-red-600'
}

function profitColor(cents: number): string {
  if (cents > 0)   return 'text-emerald-600'
  if (cents === 0) return 'text-gray-500'
  return 'text-red-600'
}

function formatCents(cents: number, currency = ''): string {
  const abs = Math.abs(cents / 100)
  const formatted = abs >= 1000
    ? `${(abs / 1000).toFixed(1)}k`
    : abs.toFixed(0)
  return cents < 0 ? `-${currency}${formatted}` : `${currency}${formatted}`
}

// ── Batch card ────────────────────────────────────────────────────────────────

function BatchCard({
  closeout,
  currency,
  rank,
}: {
  closeout: CloseoutWithEnterprise
  currency: string
  rank: number
}) {
  const dateLabel = (() => {
    try { return format(new Date(closeout.closeoutDate), 'MMM d, yyyy') }
    catch { return closeout.closeoutDate }
  })()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {rank}
            </span>
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{closeout.enterpriseName}</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 pl-7">{dateLabel} · {closeout.totalDays}d</p>
        </div>
        <div className="text-right ml-2 shrink-0">
          <p className={`font-bold text-sm ${profitColor(closeout.netProfitCents)}`}>
            {closeout.netProfitCents >= 0 ? '+' : ''}{formatCents(closeout.netProfitCents, currency)}
          </p>
          <p className="text-xs text-gray-400">net profit</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2 border-t border-gray-50 pt-3">
        <div className="text-center">
          <p className={`text-sm font-bold ${fcrColor(closeout.avgFCR)}`}>
            {closeout.avgFCR != null ? closeout.avgFCR.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-400">FCR</p>
        </div>
        <div className="text-center">
          <p className={`text-sm font-bold ${mortColor(closeout.mortalityRate)}`}>
            {closeout.mortalityRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400">Mortality</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700">{closeout.finalCount}</p>
          <p className="text-xs text-gray-400">Final head</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700">
            {closeout.totalFeedConsumedKg >= 1000
              ? `${(closeout.totalFeedConsumedKg / 1000).toFixed(1)}t`
              : `${closeout.totalFeedConsumedKg.toFixed(0)}kg`}
          </p>
          <p className="text-xs text-gray-400">Feed</p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BatchComparisonPage() {
  const navigate  = useNavigate()
  const orgId     = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const currency  = useAuthStore(s => s.appUser?.currencySymbol ?? '')
  const [sortKey, setSortKey]   = useState<SortKey>('date')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const closeouts = useLiveQuery(async () => {
    if (!orgId) return []

    const allCloseouts = await db.batchCloseouts
      .where('organizationId')
      .equals(orgId)
      .toArray()

    const instanceIds = [...new Set(allCloseouts.map(c => c.enterpriseInstanceId))]
    const instances = await db.enterpriseInstances
      .where('id')
      .anyOf(instanceIds)
      .toArray()
    const instanceMap = new Map(instances.map(i => [i.id, i]))

    return allCloseouts
      .map(c => {
        const inst = instanceMap.get(c.enterpriseInstanceId)
        return {
          ...c,
          enterpriseName: inst?.name ?? 'Unknown',
          enterpriseType: inst?.enterpriseType ?? 'unknown',
        } as CloseoutWithEnterprise
      })
  }, [orgId])

  if (closeouts === undefined) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50 text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  const enterpriseTypes = ['all', ...new Set(closeouts.map(c => c.enterpriseType))]

  const filtered = typeFilter === 'all'
    ? closeouts
    : closeouts.filter(c => c.enterpriseType === typeFilter)

  const sorted = [...filtered].sort((a, b) => {
    const av = sortValue(a, sortKey)
    const bv = sortValue(b, sortKey)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'netProfit' ? 'desc' : key === 'fcr' || key === 'mortality' ? 'asc' : 'desc')
    }
  }

  // Summary stats
  const avgFCR = filtered.filter(c => c.avgFCR != null).length > 0
    ? filtered.filter(c => c.avgFCR != null).reduce((s, c) => s + c.avgFCR!, 0) / filtered.filter(c => c.avgFCR != null).length
    : null
  const avgMort = filtered.length > 0
    ? filtered.reduce((s, c) => s + c.mortalityRate, 0) / filtered.length
    : 0
  const totalProfit = filtered.reduce((s, c) => s + c.netProfitCents, 0)

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-safe-top pb-4">
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white -ml-2">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Batch Comparison</h1>
            <p className="text-white/70 text-sm">Historical batch performance</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className={`text-lg font-bold ${fcrColor(avgFCR)}`}>
                {avgFCR != null ? avgFCR.toFixed(2) : '—'}
              </p>
              <p className="text-xs text-gray-500">Avg FCR</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className={`text-lg font-bold ${mortColor(avgMort)}`}>{avgMort.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Avg Mort.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className={`text-lg font-bold ${profitColor(totalProfit)}`}>
                {formatCents(totalProfit, currency)}
              </p>
              <p className="text-xs text-gray-500">Total profit</p>
            </div>
          </div>
        )}

        {/* Type filter */}
        {enterpriseTypes.length > 2 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {enterpriseTypes.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {t === 'all' ? 'All' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Sort controls */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                sortKey === key
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {SORT_LABELS[key]}
              {sortKey === key && (
                sortDir === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>

        {/* Batch list */}
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-sm">No batch closeouts found</p>
            <p className="text-xs mt-1">Complete a batch to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((c, i) => (
              <BatchCard key={c.id} closeout={c} currency={currency} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

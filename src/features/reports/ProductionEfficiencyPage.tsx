import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpDown, Copy } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import type { EnterpriseType } from '../../shared/types'

// ── Sortable table header cell ────────────────────────────────────────────────

function ThCol({
  label, k, sortKey, onSort,
}: {
  label: string
  k: string
  sortKey: string
  onSort: (k: string) => void
}) {
  return (
    <button
      onClick={() => onSort(k)}
      className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${sortKey === k ? 'text-primary-600' : 'text-gray-400'}`}
    >
      {label} <ArrowUpDown size={9} />
    </button>
  )
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

const FCR_GOOD  = 2.0
const FCR_WARN  = 2.5
const MORT_GOOD = 3.0
const MORT_WARN = 6.0
const COST_UNITS: Partial<Record<EnterpriseType, string>> = {
  layers:         '$/egg',
  broilers:       '$/kg',
  cattle_dairy:   '$/L',
  cattle_beef:    '$/head',
  fish:           '$/kg',
  pigs_breeding:  '$/head',
  pigs_growfinish:'$/kg',
  rabbit:         '$/kg',
  crop_annual:    '$/kg',
  crop_perennial: '$/kg',
}

const TYPE_LABEL: Record<EnterpriseType, string> = {
  layers:          'Layers',
  broilers:        'Broilers',
  cattle_dairy:    'Dairy',
  cattle_beef:     'Beef',
  fish:            'Fish',
  pigs_breeding:   'Pigs (breed)',
  pigs_growfinish: 'Pigs (grow)',
  rabbit:          'Rabbit',
  crop_annual:     'Crop',
  crop_perennial:  'Perennial',
  custom_animal:   'Custom',
}

// ── Row type ──────────────────────────────────────────────────────────────────

interface EfficiencyRow {
  id: string
  name: string
  type: EnterpriseType
  days: number
  fcr: number | null
  mortalityPct: number | null
  costPerUnit: number | null
  status: 'good' | 'warn' | 'poor'
}

// ── Status colour helper ──────────────────────────────────────────────────────

function cellColor(val: number | null, good: number, warn: number, inverse = false): string {
  if (val === null) return 'text-gray-400'
  const isGood = inverse ? val <= good : val >= good
  const isWarn = inverse ? val <= warn : val >= warn
  if (isGood) return 'text-emerald-600 font-semibold'
  if (isWarn) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'days' | 'fcr' | 'mortalityPct' | 'costPerUnit' | 'status'

export default function ProductionEfficiencyPage() {
  const navigate = useNavigate()
  const userId   = useAuthStore(s => s.user?.id)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortAsc, setSortAsc] = useState(true)

  const rows = useLiveQuery(async () => {
    if (!userId) return []
    const user = await db.appUsers.get(userId)
    if (!user) return []

    const locations = await db.farmLocations.where('organizationId').equals(user.organizationId).toArray()
    const locIds    = new Set(locations.map(l => l.id))
    const allInfras = await db.infrastructures.toArray()
    const orgInfraIds = allInfras.filter(i => locIds.has(i.farmLocationId)).map(i => i.id)

    if (orgInfraIds.length === 0) return []

    const enterprises = await db.enterpriseInstances
      .where('infrastructureId').anyOf(orgInfraIds)
      .filter(e => e.status === 'active')
      .toArray()

    const txns = await db.financialTransactions
      .where('organizationId').equals(user.organizationId).toArray()

    const result: EfficiencyRow[] = await Promise.all(enterprises.map(async ent => {
      const days = Math.max(0, Math.floor((Date.now() - new Date(ent.startDate).getTime()) / 86_400_000))

      // Fetch records for the enterprise type
      let totalFeed = 0
      let totalDeaths = 0
      let totalHarvest = 0
      let totalMilk = 0
      let latestWeight: number | null = null
      let totalEggs = 0

      switch (ent.enterpriseType) {
        case 'layers': {
          const recs = await db.layerDailyRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalFeed   += r.feedConsumedKg ?? 0
            totalDeaths += r.mortalityCount ?? 0
            totalEggs   += r.totalEggs ?? 0
          }
          break
        }
        case 'broilers': {
          const recs = await db.broilerDailyRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalFeed   += r.feedConsumedKg ?? 0
            totalDeaths += r.mortalityCount ?? 0
          }
          const latest = recs.sort((a, b) => b.date.localeCompare(a.date))[0]
          latestWeight = latest?.bodyWeightSampleAvg ?? null
          break
        }
        case 'cattle_dairy':
        case 'cattle_beef': {
          const recs = await db.cattleDailyRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalFeed   += r.feedConsumedKg ?? 0
            totalDeaths += r.deaths ?? 0
            totalMilk   += r.milkYieldLiters ?? 0
          }
          break
        }
        case 'fish': {
          const recs = await db.fishDailyRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalFeed   += r.feedGivenKg ?? 0
            totalDeaths += r.estimatedMortality ?? 0
          }
          break
        }
        case 'pigs_breeding':
        case 'pigs_growfinish': {
          const recs = await db.pigDailyRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalFeed   += r.feedConsumedKg ?? 0
            totalDeaths += r.mortalityCount ?? 0
          }
          const latest = recs.sort((a, b) => b.date.localeCompare(a.date))[0]
          latestWeight = (latest as any)?.bodyWeightSampleAvg ?? null
          break
        }
        case 'rabbit': {
          const recs = await db.rabbitDailyRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalFeed   += (r as any).feedConsumedKg ?? 0
            totalDeaths += (r as any).mortalityCount ?? 0
          }
          break
        }
        case 'crop_annual':
        case 'crop_perennial': {
          const recs = await db.cropActivityRecords.where('enterpriseInstanceId').equals(ent.id).toArray()
          for (const r of recs) {
            totalHarvest += r.harvestQuantityKg ?? 0
          }
          break
        }
        default:
          break
      }

      // Expenses for this enterprise
      const entTxns = txns.filter(t => t.enterpriseInstanceId === ent.id && t.type === 'expense')
      const totalExpenses = entTxns.reduce((s, t) => s + t.amount, 0)

      // FCR — for feed-based enterprises
      let fcr: number | null = null
      const isFeedType = ['broilers', 'pigs_growfinish', 'rabbit'].includes(ent.enterpriseType)
      if (isFeedType && totalFeed > 0 && latestWeight != null && ent.currentStockCount > 0) {
        const totalBiomasKg = ent.currentStockCount * latestWeight
        fcr = totalBiomasKg > 0 ? totalFeed / totalBiomasKg : null
      }

      // Mortality %
      const mortalityPct = ent.initialStockCount > 0
        ? (totalDeaths / ent.initialStockCount) * 100
        : null

      // Cost/unit
      let costPerUnit: number | null = null
      if (totalExpenses > 0) {
        switch (ent.enterpriseType) {
          case 'layers':          costPerUnit = totalEggs > 0 ? totalExpenses / totalEggs : null; break
          case 'broilers':        costPerUnit = latestWeight && ent.currentStockCount > 0 ? totalExpenses / (ent.currentStockCount * latestWeight) : null; break
          case 'cattle_dairy':    costPerUnit = totalMilk > 0 ? totalExpenses / totalMilk : null; break
          case 'cattle_beef':     costPerUnit = ent.currentStockCount > 0 ? totalExpenses / ent.currentStockCount : null; break
          case 'fish':            costPerUnit = null; break  // no harvest weight tracked yet
          case 'crop_annual':
          case 'crop_perennial':  costPerUnit = totalHarvest > 0 ? totalExpenses / totalHarvest : null; break
          default:                costPerUnit = ent.currentStockCount > 0 ? totalExpenses / ent.currentStockCount : null; break
        }
      }

      // Overall status (worst dimension wins)
      let status: EfficiencyRow['status'] = 'good'
      if (fcr !== null && fcr >= FCR_WARN)         status = 'poor'
      else if (fcr !== null && fcr >= FCR_GOOD)    status = status === 'good' ? 'warn' : status
      if (mortalityPct !== null && mortalityPct >= MORT_WARN) status = 'poor'
      else if (mortalityPct !== null && mortalityPct >= MORT_GOOD) status = status === 'good' ? 'warn' : status

      return { id: ent.id, name: ent.name, type: ent.enterpriseType, days, fcr, mortalityPct, costPerUnit, status }
    }))

    return result
  }, [userId]) ?? []

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const statusOrder = { poor: 0, warn: 1, good: 2 }
      let cmp = 0
      switch (sortKey) {
        case 'name':         cmp = a.name.localeCompare(b.name); break
        case 'days':         cmp = (a.days ?? 0) - (b.days ?? 0); break
        case 'fcr':          cmp = (a.fcr ?? 999) - (b.fcr ?? 999); break
        case 'mortalityPct': cmp = (a.mortalityPct ?? 0) - (b.mortalityPct ?? 0); break
        case 'costPerUnit':  cmp = (a.costPerUnit ?? 0) - (b.costPerUnit ?? 0); break
        case 'status':       cmp = statusOrder[a.status] - statusOrder[b.status]; break
      }
      return sortAsc ? cmp : -cmp
    })
  }, [rows, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const exportCsv = () => {
    const header = 'Enterprise,Type,Days,FCR,Mortality%,Cost/Unit,Status'
    const data = sorted.map(r =>
      [
        r.name, TYPE_LABEL[r.type], r.days,
        r.fcr?.toFixed(2) ?? '—',
        r.mortalityPct?.toFixed(1) ?? '—',
        r.costPerUnit?.toFixed(2) ?? '—',
        r.status,
      ].join(','),
    ).join('\n')
    navigator.clipboard.writeText(`${header}\n${data}`)
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-10 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Production Efficiency</h1>
            <p className="text-xs text-gray-500">FCR · Mortality · Cost/unit across enterprises</p>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1 text-xs text-primary-600 font-medium border border-primary-200 rounded-lg px-2.5 py-1.5"
          >
            <Copy size={12} /> CSV
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Good</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Warning</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Poor</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-semibold text-gray-600 mb-1">No active enterprises</p>
            <p className="text-xs text-gray-400">Add enterprises and daily records to see efficiency metrics</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2"><ThCol label="Enterprise" k="name" sortKey={sortKey} onSort={handleSort} /></th>
                    <th className="px-3 py-2"><ThCol label="Days" k="days" sortKey={sortKey} onSort={handleSort} /></th>
                    <th className="px-3 py-2"><ThCol label="FCR" k="fcr" sortKey={sortKey} onSort={handleSort} /></th>
                    <th className="px-3 py-2"><ThCol label="Mort%" k="mortalityPct" sortKey={sortKey} onSort={handleSort} /></th>
                    <th className="px-3 py-2"><ThCol label="Cost/Unit" k="costPerUnit" sortKey={sortKey} onSort={handleSort} /></th>
                    <th className="px-3 py-2"><ThCol label="Status" k="status" sortKey={sortKey} onSort={handleSort} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(row => {
                    const statusCls = row.status === 'good' ? 'text-emerald-600' : row.status === 'warn' ? 'text-amber-600' : 'text-red-500'
                    const statusDot = row.status === 'good' ? 'bg-emerald-500' : row.status === 'warn' ? 'bg-amber-400' : 'bg-red-500'
                    return (
                      <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <p className="text-xs font-semibold text-gray-800 truncate max-w-[100px]">{row.name}</p>
                          <p className="text-[10px] text-gray-400">{TYPE_LABEL[row.type]}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">{row.days}</td>
                        <td className={`px-3 py-3 text-xs ${cellColor(row.fcr, FCR_GOOD, FCR_WARN, true)}`}>
                          {row.fcr !== null ? row.fcr.toFixed(2) : '—'}
                        </td>
                        <td className={`px-3 py-3 text-xs ${cellColor(row.mortalityPct, MORT_GOOD, MORT_WARN, true)}`}>
                          {row.mortalityPct !== null ? `${row.mortalityPct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          {row.costPerUnit !== null ? `$${row.costPerUnit.toFixed(2)}` : '—'}
                          {row.costPerUnit !== null && (
                            <span className="text-[10px] text-gray-400 block">{COST_UNITS[row.type] ?? ''}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${statusCls}`}>
                            <span className={`w-2 h-2 rounded-full ${statusDot} flex-shrink-0`} />
                            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Benchmark reference */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Benchmarks</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>FCR: <span className="text-emerald-600 font-medium">&lt;{FCR_GOOD} Good</span> · <span className="text-amber-600 font-medium">&lt;{FCR_WARN} Warning</span> · <span className="text-red-500 font-medium">≥{FCR_WARN} Poor</span></p>
            <p>Mortality: <span className="text-emerald-600 font-medium">&lt;{MORT_GOOD}% Good</span> · <span className="text-amber-600 font-medium">&lt;{MORT_WARN}% Warning</span> · <span className="text-red-500 font-medium">≥{MORT_WARN}% Poor</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}

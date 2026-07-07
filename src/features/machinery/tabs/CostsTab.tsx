import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subMonths } from 'date-fns'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { useMaintenanceRecords, useFuelLogs } from '../../../core/database/hooks/use-machinery'
import { calculateTotalCostOfOwnership } from '../services/machinery-calculator'
import { CostBreakdownPie } from '../../../shared/components/charts/CostBreakdownPie'
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart'
import { db } from '../../../core/database/db'
import type { Machine } from '../../../shared/types'

const EMPTY_NAME_MAP = new Map<string, string>()

export function CostsTab({ machine }: { machine: Machine }) {
  const { fmt } = useCurrency()
  const maintenanceRecords = useMaintenanceRecords(machine.id)
  const fuelLogs = useFuelLogs(machine.id)

  const tco = useMemo(
    () => calculateTotalCostOfOwnership(machine, maintenanceRecords ?? [], fuelLogs ?? []),
    [machine, maintenanceRecords, fuelLogs],
  )

  const pieData = [
    { name: 'Purchase', value: tco.breakdown.purchase, color: '#2D6A4F' },
    { name: 'Maintenance', value: tco.breakdown.maintenance, color: '#DAA520' },
    { name: 'Fuel', value: tco.breakdown.fuel, color: '#f59e0b' },
    { name: 'Insurance', value: tco.breakdown.insurance, color: '#8b5cf6' },
  ]

  const monthlyTrend = useMemo(() => {
    const months: { key: string; label: string }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      months.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM') })
    }
    return months.map(({ key, label }) => {
      const maintCost = (maintenanceRecords ?? [])
        .filter(r => r.date.startsWith(key))
        .reduce((s, r) => s + r.totalCost, 0)
      const fuelCost = (fuelLogs ?? [])
        .filter(f => f.date.startsWith(key))
        .reduce((s, f) => s + f.totalCost, 0)
      return { date: label, value: Math.round(maintCost + fuelCost) }
    })
  }, [maintenanceRecords, fuelLogs])

  const enterpriseNames = useLiveQuery(async () => {
    const ids = [...new Set((fuelLogs ?? []).map(f => f.enterpriseInstanceId).filter((id): id is string => !!id))]
    if (ids.length === 0) return new Map<string, string>()
    const ents = await db.enterpriseInstances.bulkGet(ids)
    return new Map(ents.filter((e): e is NonNullable<typeof e> => !!e).map(e => [e.id, e.name]))
  }, [fuelLogs]) ?? EMPTY_NAME_MAP

  const costByEnterprise = useMemo(() => {
    const totals = new Map<string, number>()
    for (const f of fuelLogs ?? []) {
      const key = f.enterpriseInstanceId ?? 'unassigned'
      totals.set(key, (totals.get(key) ?? 0) + f.totalCost)
    }
    return Array.from(totals.entries())
      .filter(([, v]) => v > 0)
      .map(([id, value]) => ({
        name: id === 'unassigned' ? 'Unassigned' : enterpriseNames.get(id) ?? 'Enterprise',
        value: Math.round(value),
      }))
  }, [fuelLogs, enterpriseNames])

  return (
    <div className="p-4 space-y-4">
      {/* TCO summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Total Cost of Ownership</p>
        <p className="text-2xl font-bold text-primary-700">{fmt(tco.totalCost)}</p>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">{fmt(tco.monthlyCostOfOwnership)}</p>
            <p className="text-xs text-gray-500">Per Month</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">{tco.costPerHour != null ? fmt(tco.costPerHour) : '—'}</p>
            <p className="text-xs text-gray-500">Per Hour</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800">{tco.costPerKm != null ? fmt(tco.costPerKm) : '—'}</p>
            <p className="text-xs text-gray-500">Per Km</p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">Cost Breakdown</p>
        <CostBreakdownPie data={pieData} height={200} />
      </div>

      {/* Monthly trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">Monthly Cost Trend (12mo)</p>
        <TrendLineChart data={monthlyTrend} label="Cost" height={160} />
      </div>

      {/* By enterprise */}
      {costByEnterprise.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Fuel Cost by Enterprise</p>
          <CostBreakdownPie data={costByEnterprise} height={200} />
        </div>
      )}
    </div>
  )
}

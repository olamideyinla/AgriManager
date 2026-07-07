import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { format, parseISO, subMonths } from 'date-fns'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { useFuelLogs, useUsageLogs } from '../../../core/database/hooks/use-machinery'
import { calculateFuelEfficiency } from '../services/machinery-calculator'
import type { Machine } from '../../../shared/types'

export function FuelTab({ machine }: { machine: Machine }) {
  const navigate = useNavigate()
  const { fmt } = useCurrency()
  const fuelLogs = useFuelLogs(machine.id)
  const usageLogs = useUsageLogs(machine.id)

  const efficiency = useMemo(
    () => calculateFuelEfficiency(fuelLogs ?? [], usageLogs ?? []),
    [fuelLogs, usageLogs],
  )

  const monthlyData = useMemo(() => {
    if (!fuelLogs) return []
    const cutoff = subMonths(new Date(), 12)
    const byMonth = new Map<string, { liters: number; cost: number }>()
    for (let i = 11; i >= 0; i--) {
      const key = format(subMonths(new Date(), i), 'yyyy-MM')
      byMonth.set(key, { liters: 0, cost: 0 })
    }
    for (const log of fuelLogs) {
      const d = parseISO(log.date)
      if (d < cutoff) continue
      const key = format(d, 'yyyy-MM')
      const bucket = byMonth.get(key)
      if (bucket) { bucket.liters += log.quantity; bucket.cost += log.totalCost }
    }
    return Array.from(byMonth.entries()).map(([month, v]) => ({
      month: format(parseISO(`${month}-01`), 'MMM'),
      liters: Math.round(v.liters * 10) / 10,
      cost: Math.round(v.cost),
    }))
  }, [fuelLogs])

  return (
    <div className="p-4 space-y-4">
      {/* Efficiency */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Fuel Efficiency</p>
        <div className="flex items-stretch divide-x divide-gray-100">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-primary-700">
              {efficiency.litersPerHour != null ? `${efficiency.litersPerHour.toFixed(2)}` : '—'}
            </p>
            <p className="text-xs text-gray-500">Liters / Hour</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-gray-800">
              {efficiency.fuelCostPerHour != null ? fmt(efficiency.fuelCostPerHour) : '—'}
            </p>
            <p className="text-xs text-gray-500">Cost / Hour</p>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Monthly Fuel Consumption (12mo)</p>
        {monthlyData.every(m => m.liters === 0) ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-xs">No fuel logs yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar yAxisId="l" dataKey="liters" name="Liters" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" type="monotone" dataKey="cost" name="Cost" stroke="#DAA520" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent entries */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recent Fuel Entries</p>
        {!fuelLogs || fuelLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
            <p className="text-xs text-gray-400">No fuel entries yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fuelLogs.slice(0, 10).map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.quantity} L</p>
                  <p className="text-xs text-gray-400">{f.date}{f.supplier ? ` · ${f.supplier}` : ''}</p>
                </div>
                <p className="text-sm font-semibold text-gray-700">{fmt(f.totalCost)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/machinery/${machine.id}/fuel/add`)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 text-white font-semibold text-sm active:bg-primary-700 transition-colors"
      >
        <Plus size={16} /> Add Fuel Entry
      </button>
    </div>
  )
}

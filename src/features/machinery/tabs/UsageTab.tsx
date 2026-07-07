import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useUsageLogs } from '../../../core/database/hooks/use-machinery'
import { CostBreakdownPie } from '../../../shared/components/charts/CostBreakdownPie'
import { db } from '../../../core/database/db'
import type { Machine } from '../../../shared/types'

const EMPTY_NAME_MAP = new Map<string, string>()

export function UsageTab({ machine }: { machine: Machine }) {
  const navigate = useNavigate()
  const usageLogs = useUsageLogs(machine.id)

  const enterpriseNames = useLiveQuery(async () => {
    const ids = [...new Set((usageLogs ?? []).map(u => u.enterpriseInstanceId).filter((id): id is string => !!id))]
    if (ids.length === 0) return new Map<string, string>()
    const ents = await db.enterpriseInstances.bulkGet(ids)
    return new Map(ents.filter((e): e is NonNullable<typeof e> => !!e).map(e => [e.id, e.name]))
  }, [usageLogs]) ?? EMPTY_NAME_MAP

  const dailyData = useMemo(() => {
    if (!usageLogs) return []
    const cutoff = subDays(new Date(), 30)
    const byDay = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      byDay.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0)
    }
    for (const log of usageLogs) {
      const d = parseISO(log.date)
      if (d < cutoff) continue
      if (byDay.has(log.date)) byDay.set(log.date, (byDay.get(log.date) ?? 0) + (log.hoursUsed ?? 0))
    }
    return Array.from(byDay.entries()).map(([date, hours]) => ({
      date: format(parseISO(date), 'd MMM'),
      hours: Math.round(hours * 10) / 10,
    }))
  }, [usageLogs])

  const byEnterprise = useMemo(() => {
    if (!usageLogs) return []
    const totals = new Map<string, number>()
    for (const log of usageLogs) {
      const key = log.enterpriseInstanceId ?? 'unassigned'
      totals.set(key, (totals.get(key) ?? 0) + (log.hoursUsed ?? 0))
    }
    return Array.from(totals.entries())
      .filter(([, v]) => v > 0)
      .map(([id, value]) => ({
        name: id === 'unassigned' ? 'Unassigned' : enterpriseNames.get(id) ?? 'Enterprise',
        value: Math.round(value * 10) / 10,
      }))
  }, [usageLogs, enterpriseNames])

  return (
    <div className="p-4 space-y-4">
      {/* Daily usage */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Daily Hours (30d)</p>
        {dailyData.every(d => d.hours === 0) ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-xs">No usage logged yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="hours" name="Hours" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By enterprise */}
      {byEnterprise.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Usage by Enterprise</p>
          <CostBreakdownPie data={byEnterprise} height={200} />
        </div>
      )}

      {/* Log list */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Usage Log</p>
        {!usageLogs || usageLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
            <p className="text-xs text-gray-400">No usage logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {usageLogs.slice(0, 10).map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{u.purpose}</p>
                  <p className="text-xs text-gray-400">{u.date}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {u.hoursUsed != null && <>{u.hoursUsed}h</>}
                  {u.kmDriven != null && <> · {u.kmDriven}km</>}
                  {u.operatedBy && <> · {u.operatedBy}</>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/machinery/${machine.id}/usage/add`)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 text-white font-semibold text-sm active:bg-primary-700 transition-colors"
      >
        <Plus size={16} /> Log Usage
      </button>
    </div>
  )
}

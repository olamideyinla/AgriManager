import { useNavigate } from 'react-router-dom'
import { Plus, Wrench } from 'lucide-react'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { useMaintenanceSchedules, useMaintenanceRecords } from '../../../core/database/hooks/use-machinery'
import { calculateNextMaintenanceDue } from '../services/machinery-calculator'
import type { Machine, MaintenanceType } from '../../../shared/types'

const TYPE_BADGE: Record<MaintenanceType, string> = {
  scheduled: 'bg-emerald-100 text-emerald-700',
  repair: 'bg-amber-100 text-amber-700',
  overhaul: 'bg-purple-100 text-purple-700',
  inspection: 'bg-blue-100 text-blue-700',
  emergency: 'bg-red-100 text-red-700',
}

const TYPE_LABEL: Record<MaintenanceType, string> = {
  scheduled: 'Scheduled', repair: 'Repair', overhaul: 'Overhaul', inspection: 'Inspection', emergency: 'Emergency',
}

function scheduleStatusIcon(isOverdue: boolean, dueSoon: boolean): string {
  if (isOverdue) return '🔴'
  if (dueSoon) return '⚠️'
  return '✅'
}

export function MaintenanceTab({ machine }: { machine: Machine }) {
  const navigate = useNavigate()
  const { fmt } = useCurrency()
  const schedules = useMaintenanceSchedules(machine.id)
  const records = useMaintenanceRecords(machine.id)

  return (
    <div className="p-4 space-y-4">
      {/* Record Maintenance — prominent */}
      <button
        onClick={() => navigate(`/machinery/${machine.id}/maintenance/record`)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 text-white font-semibold text-sm active:bg-primary-700 transition-colors"
      >
        <Wrench size={16} /> Record Maintenance
      </button>

      {/* Scheduled maintenance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Scheduled Maintenance</p>
          <button
            onClick={() => navigate(`/machinery/${machine.id}/maintenance/schedule/add`)}
            className="text-xs text-primary-600 font-semibold flex items-center gap-1"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {!schedules || schedules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
            <p className="text-xs text-gray-400">No maintenance schedules yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map(s => {
              const due = calculateNextMaintenanceDue(s, machine)
              const dueSoon = !due.isOverdue && (
                (due.daysUntilDue != null && due.daysUntilDue <= 7) ||
                (due.hoursUntilDue != null && due.hoursUntilDue <= 50)
              )
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <span>{scheduleStatusIcon(due.isOverdue, dueSoon)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Every {s.intervalValue} {s.intervalType}
                    {s.lastPerformedDate && <> · Last: {s.lastPerformedDate}</>}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${due.isOverdue ? 'text-red-600' : dueSoon ? 'text-amber-600' : 'text-gray-500'}`}>
                    {due.isOverdue
                      ? `Overdue by ${Math.abs(due.daysUntilDue ?? due.hoursUntilDue ?? 0)} ${due.daysUntilDue != null ? 'days' : 'hours'}`
                      : due.daysUntilDue != null
                      ? `Due in ${due.daysUntilDue} days (${due.nextDueDate})`
                      : due.hoursUntilDue != null
                      ? `Due in ${due.hoursUntilDue} hours (at ${due.nextDueHours})`
                      : due.nextDueKm != null
                      ? `Due at ${due.nextDueKm.toLocaleString()} km`
                      : 'Not yet scheduled'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Maintenance history */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Maintenance History</p>
        {!records || records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center">
            <p className="text-xs text-gray-400">No maintenance recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[r.type]}`}>
                    {TYPE_LABEL[r.type].toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-400">{r.date}</p>
                </div>
                <p className="text-sm text-gray-800">{r.description}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-gray-400">{r.performedBy ?? 'Not specified'}</p>
                  <p className="text-sm font-semibold text-gray-700">{fmt(r.totalCost)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

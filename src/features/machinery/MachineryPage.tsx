import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useMachines, useMaintenanceSchedules } from '../../core/database/hooks/use-machinery'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { FeatureGate } from '../../shared/components/FeatureGate'
import { usePageTitle } from '../../shared/hooks/usePageTitle'
import { db } from '../../core/database/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { calculateDepreciation, calculateNextMaintenanceDue } from './services/machinery-calculator'
import type { Machine, MachineCategory, MachineStatus } from '../../shared/types'

// ── Category / status config ──────────────────────────────────────────────────

const CATEGORY_ICON: Record<MachineCategory, string> = {
  generator: '🔌', pump: '💧', tractor: '🚜', vehicle: '🚗',
  processing: '⚙️', irrigation: '🌊', sprayer: '🧴', incubator: '🐣',
  cold_storage: '❄️', feed_mill: '🏭', tools: '🔧', other: '📦',
}

const STATUS_LABEL: Record<MachineStatus, string> = {
  active: 'Active', under_repair: 'Under Repair', idle: 'Idle', retired: 'Retired', sold: 'Sold',
}

const STATUS_BADGE: Record<MachineStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  under_repair: 'bg-amber-100 text-amber-700',
  idle: 'bg-gray-100 text-gray-600',
  retired: 'bg-gray-100 text-gray-400',
  sold: 'bg-gray-100 text-gray-400',
}

type TabId = 'all' | 'active' | 'under_repair' | 'idle' | 'retired'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'under_repair', label: 'Under Repair' },
  { id: 'idle', label: 'Idle' },
  { id: 'retired', label: 'Retired' },
]

// ── Machine card ──────────────────────────────────────────────────────────────

function MachineCard({ machine }: { machine: Machine }) {
  const navigate = useNavigate()
  const { fmt } = useCurrency()
  const schedules = useMaintenanceSchedules(machine.id) ?? []

  const depreciation = calculateDepreciation(machine)
  const bookValue = machine.currentEstimatedValue ?? depreciation.currentBookValue

  const dues = schedules.map(s => ({ schedule: s, due: calculateNextMaintenanceDue(s, machine) }))
  const overdue = dues.find(d => d.due.isOverdue)
  const nextUp = dues
    .filter(d => !d.due.isOverdue)
    .sort((a, b) => (a.due.daysUntilDue ?? a.due.hoursUntilDue ?? Infinity) - (b.due.daysUntilDue ?? b.due.hoursUntilDue ?? Infinity))[0]

  return (
    <button
      onClick={() => navigate(`/machinery/${machine.id}`)}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{CATEGORY_ICON[machine.category]}</span>
          <p className="text-sm font-semibold text-gray-800 truncate">{machine.name}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[machine.status]}`}>
          {STATUS_LABEL[machine.status].toUpperCase()}
        </span>
      </div>

      <p className="text-xs text-gray-400 mt-1.5">
        {machine.purchaseDate && <>Purchased: {machine.purchaseDate.slice(0, 7)} · </>}
        Value: {fmt(bookValue)}
      </p>

      {(machine.hoursCounter != null || machine.odometerKm != null) && (
        <p className="text-xs text-gray-400 mt-0.5">
          {machine.hoursCounter != null && <>Hours: {machine.hoursCounter.toLocaleString()}</>}
          {machine.odometerKm != null && <> · {machine.odometerKm.toLocaleString()} km</>}
          {nextUp && (
            <> · Next service: in {nextUp.due.daysUntilDue ?? nextUp.due.hoursUntilDue}{nextUp.due.daysUntilDue != null ? ' days' : ' hours'}</>
          )}
        </p>
      )}

      {overdue && (
        <p className="text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1">
          ⚠ {overdue.schedule.name} overdue{overdue.due.daysUntilDue != null
            ? ` by ${Math.abs(overdue.due.daysUntilDue)} day${Math.abs(overdue.due.daysUntilDue) !== 1 ? 's' : ''}`
            : overdue.due.hoursUntilDue != null
            ? ` by ${Math.abs(overdue.due.hoursUntilDue)} hours`
            : ''}
        </p>
      )}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function MachineryPageContent() {
  usePageTitle('Machinery & Equipment')
  const navigate = useNavigate()
  const orgId = useAuthStore(s => s.appUser?.organizationId)
  const machines = useMachines(orgId)
  const { fmt } = useCurrency()
  const [tab, setTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')

  const scheduleData = useLiveQuery(async () => {
    if (!machines || machines.length === 0) return { dueCount: 0 }
    const ids = machines.map(m => m.id)
    const schedules = await db.maintenanceSchedules.where('machineId').anyOf(ids).toArray()
    const machineMap = new Map(machines.map(m => [m.id, m]))
    let dueCount = 0
    for (const s of schedules) {
      const m = machineMap.get(s.machineId)
      if (!m) continue
      const due = calculateNextMaintenanceDue(s, m)
      if (due.isOverdue || (due.daysUntilDue != null && due.daysUntilDue <= 7) || (due.hoursUntilDue != null && due.hoursUntilDue <= 50)) {
        dueCount++
      }
    }
    return { dueCount }
  }, [machines])

  const filtered = useMemo(() => {
    if (!machines) return []
    let list = machines
    if (tab !== 'all') list = list.filter(m => m.status === tab)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.make ?? '').toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [machines, tab, search])

  if (machines === undefined) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
  }

  const activeCount = machines.filter(m => m.status === 'active').length
  const underRepairCount = machines.filter(m => m.status === 'under_repair').length
  const idleCount = machines.filter(m => m.status === 'idle').length
  const totalValue = machines.reduce((s, m) => s + (m.currentEstimatedValue ?? calculateDepreciation(m).currentBookValue), 0)
  const dueCount = scheduleData?.dueCount ?? 0

  return (
    <div className="min-h-dvh bg-gray-50 pb-24 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 transition-transform -ml-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Machinery & Equipment</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            {machines.length} machine{machines.length !== 1 ? 's' : ''}
            <span className="text-gray-400 font-normal text-xs ml-1">
              (Active: {activeCount}, Under Repair: {underRepairCount}, Idle: {idleCount})
            </span>
          </p>
          <div className="flex items-stretch divide-x divide-gray-100">
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-primary-700">{fmt(totalValue)}</p>
              <p className="text-xs text-gray-500">Total Asset Value</p>
            </div>
            <div className="flex-1 text-center">
              <p className={`text-lg font-bold ${dueCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{dueCount}</p>
              <p className="text-xs text-gray-500">Maintenance Due</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, make, or category…"
            className="input-base pl-9"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🚜</p>
            <p className="text-sm text-gray-500 font-medium">No machines found</p>
            <p className="text-xs text-gray-400 mt-1">Add your first machine to start tracking it</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(m => <MachineCard key={m.id} machine={m} />)}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/machinery/add')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary-600 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
        aria-label="Add Machine"
      >
        <Plus size={26} className="text-white" />
      </button>
    </div>
  )
}

export default function MachineryPage() {
  return (
    <FeatureGate feature="machinery_equipment" softLock>
      <MachineryPageContent />
    </FeatureGate>
  )
}

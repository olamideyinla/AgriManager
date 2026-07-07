import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMachine, useMaintenanceRecords, useFuelLogs } from '../../core/database/hooks/use-machinery'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { usePageTitle } from '../../shared/hooks/usePageTitle'
import { FeatureGate } from '../../shared/components/FeatureGate'
import { calculateDepreciation, calculateTotalCostOfOwnership } from './services/machinery-calculator'
import { OverviewTab } from './tabs/OverviewTab'
import { MaintenanceTab } from './tabs/MaintenanceTab'
import { FuelTab } from './tabs/FuelTab'
import { UsageTab } from './tabs/UsageTab'
import { CostsTab } from './tabs/CostsTab'
import type { Machine, MachineCategory, MachineStatus } from '../../shared/types'

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

const TABS = ['Overview', 'Maintenance', 'Fuel', 'Usage', 'Costs'] as const
type TabId = typeof TABS[number]

function MachineDetailContent({ machine }: { machine: Machine }) {
  usePageTitle(machine.name)
  const navigate = useNavigate()
  const { fmt } = useCurrency()
  const [tab, setTab] = useState<TabId>('Overview')
  const maintenanceRecords = useMaintenanceRecords(machine.id)
  const fuelLogs = useFuelLogs(machine.id)

  const dep = calculateDepreciation(machine)
  const tco = calculateTotalCostOfOwnership(machine, maintenanceRecords ?? [], fuelLogs ?? [])

  return (
    <div className="min-h-dvh bg-gray-50 pb-10 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate('/machinery')} className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 transition-transform -ml-1">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {machine.photoUrl ? (
              <img src={machine.photoUrl} alt={machine.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{CATEGORY_ICON[machine.category]}</span>
              </div>
            )}
            <h1 className="text-base font-bold text-gray-900 truncate">{machine.name}</h1>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[machine.status]}`}>
            {STATUS_LABEL[machine.status].toUpperCase()}
          </span>
        </div>

        {/* Quick stats */}
        <div className="flex items-stretch divide-x divide-gray-100">
          <div className="flex-1 text-center px-1">
            <p className="text-sm font-bold text-gray-800">{machine.purchasePrice != null ? fmt(machine.purchasePrice) : '—'}</p>
            <p className="text-[10px] text-gray-500">Purchase</p>
          </div>
          <div className="flex-1 text-center px-1">
            <p className="text-sm font-bold text-primary-700">{fmt(dep.currentBookValue)}</p>
            <p className="text-[10px] text-gray-500">Book Value</p>
          </div>
          <div className="flex-1 text-center px-1">
            <p className="text-sm font-bold text-gray-800">{fmt(tco.totalCost)}</p>
            <p className="text-[10px] text-gray-500">Total Cost</p>
          </div>
          <div className="flex-1 text-center px-1">
            <p className="text-sm font-bold text-gray-800">
              {machine.hoursCounter != null ? machine.hoursCounter.toLocaleString() : machine.odometerKm != null ? machine.odometerKm.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] text-gray-500">{machine.odometerKm != null && machine.hoursCounter == null ? 'Km' : 'Hours'}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-2 flex overflow-x-auto no-scrollbar sticky top-0 z-10">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? 'text-primary-700 border-primary-600' : 'text-gray-400 border-transparent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab machine={machine} />}
      {tab === 'Maintenance' && <MaintenanceTab machine={machine} />}
      {tab === 'Fuel' && <FuelTab machine={machine} />}
      {tab === 'Usage' && <UsageTab machine={machine} />}
      {tab === 'Costs' && <CostsTab machine={machine} />}
    </div>
  )
}

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const machine = useMachine(id)

  if (machine === undefined) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
  }
  if (machine === null || !machine) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Machine not found</div>
  }

  return (
    <FeatureGate feature="machinery_equipment" softLock>
      <MachineDetailContent machine={machine} />
    </FeatureGate>
  )
}
